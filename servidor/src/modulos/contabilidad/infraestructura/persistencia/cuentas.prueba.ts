/**
 * Prueba de integración contra PostgreSQL (base de pruebas): seguridad por empresa de la nomenclatura y del inicio,
 * los únicos, los `check`, la llave compuesta del árbol, el disparador de la hoja de detalle y la auditoría permanente.
 */
import { eq } from 'drizzle-orm';
import pg, { DatabaseError } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../../../../configuracion.js';
import { bd, grupoConexiones } from '../../../core/base-datos/conexion.js';
import { migrarModulos } from '../../../core/base-datos/migrador.js';
import { bdPropietario } from '../../../core/base-datos/sembrado-de-prueba.soporte.js';
import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { cuentas as cuentasDeSuscriptor } from '../../../core/cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { definicionesModulos } from '../../../indice.js';
import { cuentas } from './cuentas.tablas.js';
import { inicios } from './inicios.tablas.js';

let usuarioId: string;
let cuentaA: string;
let empresaA1: string;
let empresaA2: string;
let raiz: string;
let detalle: string;

const en = (empresaId: string): ContextoEmpresa => ({ empresaId, cuentaId: cuentaA, usuarioId });
const enA1 = () => en(empresaA1);

type Cuenta = typeof cuentas.$inferInsert;

const cuenta = (empresaId: string, cambios: Partial<Cuenta> = {}): Cuenta => ({
  empresaId,
  codigo: '1.1.01.01',
  nombre: 'Caja general',
  nivel: 4,
  naturaleza: 'deudora',
  tipo: 'balance',
  esDeDetalle: false,
  ...cambios,
});

/** El error de PostgreSQL de la causa: Drizzle envuelve el original en sus propias excepciones. */
async function errorDePostgres(operacion: Promise<unknown>): Promise<DatabaseError | undefined> {
  try {
    await operacion;
  } catch (error) {
    for (let actual = error; actual; actual = (actual as { cause?: unknown }).cause) {
      if (actual instanceof DatabaseError) return actual;
    }
  }
  return undefined;
}

async function comoPropietario<T extends pg.QueryResultRow>(sql: string): Promise<T[]> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  try {
    return (await conexion.query<T>(sql)).rows;
  } finally {
    await conexion.end();
  }
}

const insertar = (valores: Cuenta, contexto = enA1()) =>
  enTransaccionSegura(contexto, (tx) => tx.insert(cuentas).values(valores).returning());

beforeAll(async () => {
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  await comoPropietario('truncate core.cuentas, core.usuarios cascade');
  const [suscriptor] = await bd.insert(cuentasDeSuscriptor).values({ nombre: 'Cuenta A' }).returning();
  const [usuario] = await bd
    .insert(usuarios)
    .values({ usuario: 'contabilidaduno', nombres: 'Contabilidad', hashContrasena: 'x' })
    .returning();
  const filas = await bdPropietario
    .insert(empresas)
    .values([
      { cuentaId: suscriptor!.id, nombre: 'Empresa A1' },
      { cuentaId: suscriptor!.id, nombre: 'Empresa A2' },
    ])
    .returning();
  usuarioId = usuario!.id;
  cuentaA = suscriptor!.id;
  [empresaA1, empresaA2] = filas.map((fila) => fila.id) as [string, string];
  raiz = (await insertar(cuenta(empresaA1, { codigo: '1', nombre: 'Activo', nivel: 1 })))[0]!.id;
  detalle = (
    await insertar(
      cuenta(empresaA1, {
        codigo: '1.1',
        nombre: 'Efectivo',
        nivel: 2,
        padreId: raiz,
        esDeDetalle: true,
        rubro: 'efectivo',
        claseDeFlujo: 'efectivo',
      }),
    )
  )[0]!.id;
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('nomenclatura: seguridad por empresa', () => {
  it('cada empresa ve solo sus cuentas, aunque sean de la misma cuenta', async () => {
    await insertar(cuenta(empresaA2, { codigo: '1', nombre: 'Activo', nivel: 1 }), en(empresaA2));

    const a1 = await enTransaccionSegura(en(empresaA1), (tx) => tx.select().from(cuentas));
    const a2 = await enTransaccionSegura(en(empresaA2), (tx) => tx.select().from(cuentas));

    expect([a1.length, a2.length]).toEqual([2, 1]);
  });

  it('no se puede escribir a nombre de otra empresa', async () => {
    await expect(insertar(cuenta(empresaA2, { codigo: '9', nivel: 1 }), enA1())).rejects.toThrow();
  });

  it('el inicio también es de cada empresa', async () => {
    const valores = {
      empresaId: empresaA1,
      fecha: '2026-01-01',
      caso: 'desde_la_carga',
      mascara: '9.9.99.99',
    } as const;
    await enTransaccionSegura(enA1(), (tx) => tx.insert(inicios).values(valores));

    const a1 = await enTransaccionSegura(enA1(), (tx) => tx.select().from(inicios));
    const a2 = await enTransaccionSegura(en(empresaA2), (tx) => tx.select().from(inicios));

    expect([a1.length, a2.length]).toEqual([1, 0]);
  });
});

describe('nomenclatura: únicos, checks y árbol', () => {
  it('el código se repite en otra empresa pero no en la misma', async () => {
    const error = await errorDePostgres(insertar(cuenta(empresaA1, { codigo: '1', nombre: 'Otra', nivel: 1 })));

    expect(error?.constraint).toBe('cuentas_codigo_unico');
  });

  it('el nombre no se repite bajo la misma cuenta superior (sin mayúsculas), pero sí bajo otra', async () => {
    const hermana = cuenta(empresaA1, { codigo: '1.2', nombre: ' EFECTIVO ', nivel: 2, padreId: raiz });
    const repetido = await errorDePostgres(insertar(hermana));
    const raizRepetida = await errorDePostgres(
      insertar(cuenta(empresaA1, { codigo: '2', nombre: 'activo', nivel: 1 })),
    );

    expect(repetido?.constraint).toBe('cuentas_nombre_unico');
    expect(raizRepetida?.constraint).toBe('cuentas_nombre_unico');
  });

  it.each([
    ['rubro desconocido', { rubro: 'joyas' as never }, 'cuentas_rubro_valido'],
    ['nivel de más', { nivel: 7, codigo: '1.7', padreId: 'RAIZ' }, 'cuentas_nivel_valido'],
    ['nivel 2 sin cuenta superior', { nivel: 2, codigo: '8.1' }, 'cuentas_nivel_sin_padre'],
    ['nivel 1 con cuenta superior', { nivel: 1, codigo: '8', padreId: 'RAIZ' }, 'cuentas_nivel_sin_padre'],
    [
      'tratamiento fiscal en una de balance',
      { tratamientoFiscal: 'deducible', codigo: '5' },
      'cuentas_tratamiento_solo_en_resultados',
    ],
    ['de detalle sin rubro', { esDeDetalle: true, nivel: 1, codigo: '6' }, 'cuentas_detalle_con_rubro'],
    ['naturaleza desconocida', { naturaleza: 'neutra' as never, nivel: 1, codigo: '4' }, 'cuentas_naturaleza_valida'],
  ] as const)('rechaza %s (check)', async (_caso, cambios, restriccion) => {
    // `raiz` se conoce hasta que corre `beforeAll`: la tabla de casos solo dice «la cuenta raíz».
    const valores: Partial<Cuenta> = { nombre: 'Prueba', nivel: 1, ...(cambios as Partial<Cuenta>) };
    if (valores.padreId === 'RAIZ') valores.padreId = raiz;
    const error = await errorDePostgres(insertar(cuenta(empresaA1, valores)));

    expect(error?.constraint).toBe(restriccion);
  });

  it('la cuenta superior debe ser de la misma empresa (llave compuesta)', async () => {
    const error = await errorDePostgres(
      insertar(cuenta(empresaA2, { codigo: '1.5', nombre: 'Intrusa', nivel: 2, padreId: raiz }), en(empresaA2)),
    );

    expect(error?.constraint).toBe('cuentas_padre_fk');
  });

  it('una cuenta con cuentas inferiores no se elimina (llave foránea)', async () => {
    const error = await errorDePostgres(
      enTransaccionSegura(enA1(), (tx) => tx.delete(cuentas).where(eq(cuentas.id, raiz))),
    );

    expect(error?.code).toBe('23503');
  });
});

describe('disparador cuentas_hoja_de_detalle', () => {
  it('impide crear una cuenta bajo una de detalle', async () => {
    const error = await errorDePostgres(
      insertar(cuenta(empresaA1, { codigo: '1.1.01', nombre: 'Hija', nivel: 3, padreId: detalle })),
    );

    expect(error?.code).toBe('23514');
    expect(error?.message).toContain('de detalle');
  });

  it('impide mover una cuenta bajo una de detalle', async () => {
    const [suelta] = await insertar(cuenta(empresaA1, { codigo: '1.3', nombre: 'Suelta', nivel: 2, padreId: raiz }));

    const error = await errorDePostgres(
      enTransaccionSegura(enA1(), (tx) =>
        tx.update(cuentas).set({ padreId: detalle, nivel: 3, codigo: '1.1.9' }).where(eq(cuentas.id, suelta!.id)),
      ),
    );

    expect(error?.code).toBe('23514');
  });

  it('impide volver de detalle a una cuenta que ya tiene cuentas inferiores', async () => {
    const error = await errorDePostgres(
      enTransaccionSegura(enA1(), (tx) =>
        tx.update(cuentas).set({ esDeDetalle: true, rubro: 'efectivo' }).where(eq(cuentas.id, raiz)),
      ),
    );

    expect(error?.code).toBe('23514');
  });
});

describe('auditoría permanente', () => {
  it('la nomenclatura y el inicio no se depuran mientras exista la empresa', async () => {
    const filas = await comoPropietario<{ recurso: string }>(
      `select recurso from core.recursos_de_auditoria_permanente where recurso like 'contabilidad.%' order by recurso`,
    );

    expect(filas.map((fila) => fila.recurso)).toEqual(
      expect.arrayContaining(['contabilidad.cuentas', 'contabilidad.inicio']),
    );
  });
});
