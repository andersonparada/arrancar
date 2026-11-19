/**
 * Prueba de integración contra PostgreSQL (base de pruebas): las bodegas (checks, únicos sin mayúsculas ni acentos,
 * llave compuesta de la localidad), su alcance por registro (cada usuario ve y cambia solo las que tiene asignadas; el
 * creador y el responsable quedan asignados) y la ventana de asignación.
 */
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import pg, { DatabaseError } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../../../../configuracion.js';
import { bd, grupoConexiones } from '../../../core/base-datos/conexion.js';
import { bdPropietario } from '../../../core/base-datos/sembrado-de-prueba.soporte.js';
import { migrarModulos } from '../../../core/base-datos/migrador.js';
import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { cuentas } from '../../../core/cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresaUsuarios, empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { localidades } from '../../../empresas/infraestructura/persistencia/localidades.tablas.js';
import { tiposDeLocalidad } from '../../../empresas/infraestructura/persistencia/tipos-de-localidad.tablas.js';
import { definicionesModulos } from '../../../indice.js';
import { accesosABodegas } from './accesos-a-bodegas.tablas.js';
import { bodegas } from './bodegas.tablas.js';

const RECURSO = 'inventarios.bodegas';
let cuentaId: string;
let empresaA1: string;
let empresaA2: string;
let uno: string;
let dos: string;
let ajeno: string;
let localidadA2: string;

const ctx = (usuarioId: string, cambios: Partial<ContextoEmpresa> = {}): ContextoEmpresa => ({
  empresaId: empresaA1,
  cuentaId,
  usuarioId,
  ...cambios,
});
const conAlcanceTotal = (usuarioId: string) => ctx(usuarioId, { recursosAlcanceTotal: [RECURSO] });
const paraAsignar = (usuarioId: string) => ctx(usuarioId, { recursosParaAsignar: [RECURSO] });

type Bodega = typeof bodegas.$inferInsert;
let n = 0;
const bodega = (cambios: Partial<Bodega> = {}): Bodega => {
  n += 1;
  return { empresaId: empresaA1, codigo: `B-${n}`, nombre: `Bodega ${n}`, ...cambios };
};

/** Sin `returning`: el `select` del alcance aún no ve la bodega nueva (el disparador la asigna después del insert). */
const crear = async (valores: Bodega, contexto: ContextoEmpresa) => {
  const id = randomUUID();
  await enTransaccionSegura(contexto, (tx) => tx.insert(bodegas).values({ ...valores, id }));
  return { id };
};

const visibles = async (contexto: ContextoEmpresa) =>
  (await enTransaccionSegura(contexto, (tx) => tx.select({ id: bodegas.id }).from(bodegas))).map((f) => f.id);

async function restriccion(operacion: Promise<unknown>): Promise<string | undefined> {
  try {
    await operacion;
  } catch (error) {
    for (let actual = error; actual; actual = (actual as { cause?: unknown }).cause) {
      if (actual instanceof DatabaseError) return actual.constraint;
    }
  }
  return undefined;
}

async function comoPropietario(consulta: string): Promise<void> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  try {
    await conexion.query(consulta);
  } finally {
    await conexion.end();
  }
}

const accesosDe = (bodegaId: string) =>
  enTransaccionSegura(ctx(uno), (tx) =>
    tx
      .select({ usuarioId: accesosABodegas.usuarioId })
      .from(accesosABodegas)
      .where(eq(accesosABodegas.bodegaId, bodegaId)),
  ).then((filas) => filas.map((f) => f.usuarioId));

/** La localidad de la otra empresa, creada con el contexto de esa empresa (las tablas tienen RLS). */
async function crearLocalidadDeA2(): Promise<string> {
  const contexto = ctx(ajeno, { empresaId: empresaA2, recursosAlcanceTotal: ['empresas.localidades'] });
  return enTransaccionSegura(contexto, async (tx) => {
    const [tipo] = await tx.insert(tiposDeLocalidad).values({ empresaId: empresaA2, nombre: 'Finca' }).returning();
    const [localidad] = await tx
      .insert(localidades)
      .values({ empresaId: empresaA2, tipoId: tipo!.id, codigo: 'L-A2', nombre: 'Localidad A2' })
      .returning({ id: localidades.id });
    return localidad!.id;
  });
}

beforeAll(async () => {
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  await comoPropietario('truncate core.cuentas, core.usuarios cascade');
  const [cuenta] = await bd.insert(cuentas).values({ nombre: 'Cuenta A' }).returning();
  const personas = await bd
    .insert(usuarios)
    .values(
      ['bodeguerouno', 'bodegueroodos', 'bodegueroajeno'].map((u) => ({ usuario: u, nombres: u, hashContrasena: 'x' })),
    )
    .returning();
  const filas = await bdPropietario
    .insert(empresas)
    .values([
      { cuentaId: cuenta!.id, nombre: 'Empresa A1' },
      { cuentaId: cuenta!.id, nombre: 'Empresa A2' },
    ])
    .returning();
  cuentaId = cuenta!.id;
  [uno, dos, ajeno] = personas.map((p) => p.id) as [string, string, string];
  [empresaA1, empresaA2] = filas.map((f) => f.id) as [string, string];
  await bdPropietario.insert(empresaUsuarios).values([
    { empresaId: empresaA1, usuarioId: uno },
    { empresaId: empresaA1, usuarioId: dos },
    { empresaId: empresaA2, usuarioId: ajeno },
  ]);
  localidadA2 = await crearLocalidadDeA2();
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('bodegas: checks, únicos y llaves', () => {
  it('el código lleva mayúsculas, números y guiones (1 a 12) y el nombre de 1 a 120', async () => {
    for (const codigo of ['abc', 'CON ESPACIO', '', 'X'.repeat(13)])
      expect(await restriccion(crear(bodega({ codigo }), ctx(uno)))).toBe('bodegas_codigo_valido');
    expect(await restriccion(crear(bodega({ nombre: '  ' }), ctx(uno)))).toBe('bodegas_nombre_largo');
    expect(await restriccion(crear(bodega({ responsable: '' }), ctx(uno)))).toBe('bodegas_responsable_largo');
  });

  it('el código y el nombre no se repiten en la empresa (el nombre, sin mayúsculas ni acentos)', async () => {
    await crear(bodega({ codigo: 'UNI-1', nombre: 'Bodega Única' }), ctx(uno));

    expect(await restriccion(crear(bodega({ codigo: 'UNI-1' }), ctx(uno)))).toBe('bodegas_codigo_unico');
    expect(await restriccion(crear(bodega({ nombre: 'BODEGA UNICA' }), ctx(uno)))).toBe('bodegas_nombre_unico');
    await expect(
      crear(
        bodega({ empresaId: empresaA2, codigo: 'UNI-1', nombre: 'Bodega Única' }),
        ctx(ajeno, { empresaId: empresaA2 }),
      ),
    ).resolves.toBeDefined();
  });

  it('la localidad debe ser de la misma empresa (llave compuesta)', async () => {
    expect(await restriccion(crear(bodega({ localidadId: localidadA2 }), ctx(uno)))).toBe('bodegas_localidad_fk');
  });
});

describe('bodegas: alcance por registro', () => {
  it('quien la crea queda asignado; otro usuario sin alcance total no la ve ni la cambia', async () => {
    const creada = await crear(bodega(), ctx(uno));

    expect(await visibles(ctx(uno))).toContain(creada.id);
    expect(await visibles(ctx(dos))).not.toContain(creada.id);
    const cambiadas = await enTransaccionSegura(ctx(dos), (tx) =>
      tx.update(bodegas).set({ nombre: 'Tomada' }).where(eq(bodegas.id, creada.id)).returning(),
    );
    expect(cambiadas).toEqual([]);
  });

  it('con alcance total ve todas, también las que no tiene asignadas', async () => {
    const deUno = await crear(bodega(), ctx(uno));

    expect(await visibles(conAlcanceTotal(dos))).toContain(deUno.id);
  });

  it('el responsable con usuario recibe acceso al guardar la bodega o al cambiar de responsable', async () => {
    const nueva = await crear(bodega({ responsableUsuarioId: dos }), ctx(uno));
    const otra = await crear(bodega(), ctx(uno));
    await enTransaccionSegura(ctx(uno), (tx) =>
      tx.update(bodegas).set({ responsableUsuarioId: dos }).where(eq(bodegas.id, otra.id)),
    );

    expect(await visibles(ctx(dos))).toEqual(expect.arrayContaining([nueva.id, otra.id]));
    expect((await accesosDe(nueva.id)).sort()).toEqual([uno, dos].sort());
  });

  it('un responsable que no trabaja en la empresa no recibe acceso', async () => {
    const creada = await crear(bodega({ responsableUsuarioId: ajeno }), ctx(uno));

    expect(await accesosDe(creada.id)).toEqual([uno]);
  });

  it('al importar (sin asignar al crear) nadie recibe la bodega', async () => {
    const importada = await crear(bodega(), { ...ctx(uno), sinAsignarAlCrear: true });

    expect(await visibles(ctx(uno))).not.toContain(importada.id);
    expect(await visibles(conAlcanceTotal(uno))).toContain(importada.id);
  });

  it('al borrar la bodega sus accesos se borran con ella', async () => {
    const creada = await crear(bodega(), ctx(uno));

    await enTransaccionSegura(ctx(uno), (tx) => tx.delete(bodegas).where(eq(bodegas.id, creada.id)));

    expect(await accesosDe(creada.id)).toEqual([]);
  });
});

describe('bodegas: ventana de asignación', () => {
  it('sin la ventana, la tabla de accesos no se puede escribir', async () => {
    const creada = await crear(bodega(), ctx(uno));
    const nuevo = { empresaId: empresaA1, usuarioId: dos, bodegaId: creada.id };

    await expect(enTransaccionSegura(ctx(uno), (tx) => tx.insert(accesosABodegas).values(nuevo))).rejects.toThrow();
    expect(await accesosDe(creada.id)).toEqual([uno]);
  });

  it('con la ventana lee todas las bodegas y asigna y quita accesos, pero no las cambia', async () => {
    const creada = await crear(bodega(), ctx(uno));
    const nuevo = { empresaId: empresaA1, usuarioId: dos, bodegaId: creada.id };

    expect(await visibles(paraAsignar(dos))).toContain(creada.id);
    await enTransaccionSegura(paraAsignar(dos), (tx) => tx.insert(accesosABodegas).values(nuevo));
    expect(await visibles(ctx(dos))).toContain(creada.id);
    await enTransaccionSegura(paraAsignar(dos), (tx) =>
      tx
        .delete(accesosABodegas)
        .where(and(eq(accesosABodegas.bodegaId, creada.id), eq(accesosABodegas.usuarioId, dos))),
    );
    expect(await visibles(ctx(dos))).not.toContain(creada.id);
  });
});
