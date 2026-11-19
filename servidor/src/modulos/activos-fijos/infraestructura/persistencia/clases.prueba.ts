/**
 * Prueba de integración contra PostgreSQL (base de pruebas): seguridad por empresa de las clases de activos y de su
 * relación con los conceptos de gasto, la llave compuesta con la empresa, los `check` y la auditoría permanente.
 */
import { eq } from 'drizzle-orm';
import pg, { DatabaseError } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../../../../configuracion.js';
import { bd, grupoConexiones } from '../../../core/base-datos/conexion.js';
import { migrarModulos } from '../../../core/base-datos/migrador.js';
import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { cuentas } from '../../../core/cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { definicionesModulos } from '../../../indice.js';
import { conceptosDeGasto } from '../../../libro-de-compras/infraestructura/persistencia/conceptos-de-gasto.tablas.js';
import { clases } from './clases.tablas.js';
import { clasesPorConcepto } from './clases-por-concepto.tablas.js';

let usuarioId: string;
let cuentaA: string;
let empresaA1: string;
let empresaA2: string;
let vehiculosA1: string;
let conceptoA1: string;
let conceptoA2: string;

const en = (empresaId: string): ContextoEmpresa => ({ empresaId, cuentaId: cuentaA, usuarioId });
const enA1 = () => en(empresaA1);

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

const clase = (empresaId: string, cambios: Partial<typeof clases.$inferInsert> = {}): typeof clases.$inferInsert => ({
  empresaId,
  nombre: 'Vehículos',
  incisoFiscal: 'maquinaria_y_vehiculos',
  porcentajeFiscal: '20.00',
  ...cambios,
});

const insertarClase = (valores: typeof clases.$inferInsert, contexto = enA1()) =>
  enTransaccionSegura(contexto, (tx) => tx.insert(clases).values(valores).returning());

async function crearConcepto(contexto: ContextoEmpresa, nombre: string): Promise<string> {
  const [fila] = await enTransaccionSegura(contexto, (tx) =>
    tx.insert(conceptosDeGasto).values({ empresaId: contexto.empresaId, nombre, tipoPorOmision: 'bien' }).returning(),
  );
  return fila!.id;
}

const ligar = (claseId: string, conceptoDeGastoId: string, contexto = enA1()) =>
  enTransaccionSegura(contexto, (tx) =>
    tx.insert(clasesPorConcepto).values({ empresaId: contexto.empresaId, conceptoDeGastoId, claseId }),
  );

beforeAll(async () => {
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  await comoPropietario('truncate core.cuentas, core.usuarios cascade');
  const [cuenta] = await bd.insert(cuentas).values({ nombre: 'Cuenta A' }).returning();
  const [usuario] = await bd
    .insert(usuarios)
    .values({ usuario: 'clasesaf', nombres: 'Clases', hashContrasena: 'x' })
    .returning();
  const filas = await bd
    .insert(empresas)
    .values([
      { cuentaId: cuenta!.id, nombre: 'Empresa A1' },
      { cuentaId: cuenta!.id, nombre: 'Empresa A2' },
    ])
    .returning();
  usuarioId = usuario!.id;
  cuentaA = cuenta!.id;
  [empresaA1, empresaA2] = filas.map((fila) => fila.id) as [string, string];
  [vehiculosA1] = (await insertarClase(clase(empresaA1))).map((fila) => fila.id) as [string];
  conceptoA1 = await crearConcepto(enA1(), 'Vehículos y transporte');
  conceptoA2 = await crearConcepto(en(empresaA2), 'Vehículos y transporte');
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('clases de activos: seguridad por empresa y restricciones', () => {
  it('cada empresa ve solo las suyas, aunque sea de la misma cuenta', async () => {
    const visibles = (empresaId: string) => enTransaccionSegura(en(empresaId), (tx) => tx.select().from(clases));

    expect(await visibles(empresaA1)).toHaveLength(1);
    expect(await visibles(empresaA2)).toEqual([]);
  });

  it('no se puede escribir a nombre de otra empresa', async () => {
    await expect(insertarClase(clase(empresaA2, { nombre: 'Intrusa' }), enA1())).rejects.toThrow();
  });

  it('el nombre no se repite en la empresa (sin mayúsculas ni acentos), pero otra empresa puede usarlo', async () => {
    const repetido = await errorDePostgres(insertarClase(clase(empresaA1, { nombre: '  VEHÍCULOS ' })));

    expect(repetido?.constraint).toBe('clases_nombre_unico');
    await expect(insertarClase(clase(empresaA2), en(empresaA2))).resolves.toBeTruthy();
  });

  it.each([
    ['nombre vacío', { nombre: '   ' }, 'clases_nombre_largo'],
    ['nombre de más de 80 letras', { nombre: 'x'.repeat(81) }, 'clases_nombre_largo'],
    ['inciso desconocido', { nombre: 'Otra', incisoFiscal: 'cohetes' as never }, 'clases_inciso_fiscal'],
    ['porcentaje sobre 100', { nombre: 'Otra', porcentajeFiscal: '100.01' }, 'clases_porcentaje_fiscal'],
    [
      'terreno con porcentaje',
      { nombre: 'T', incisoFiscal: 'terrenos', porcentajeFiscal: '5' },
      'clases_terrenos_sin_porcentaje',
    ],
    ['inciso que se deprecia en 0 %', { nombre: 'Otra', porcentajeFiscal: '0' }, 'clases_terrenos_sin_porcentaje'],
    ['vida útil de 0 meses', { nombre: 'Otra', vidaUtilContableMeses: 0 }, 'clases_vida_util'],
    ['vida útil de 1201 meses', { nombre: 'Otra', vidaUtilContableMeses: 1201 }, 'clases_vida_util'],
    [
      'terreno con vida útil',
      { nombre: 'T', incisoFiscal: 'terrenos', porcentajeFiscal: '0', vidaUtilContableMeses: 12 },
      'clases_terrenos_sin_vida_util',
    ],
    ['valor residual de 100', { nombre: 'Otra', valorResidualPorcentaje: '100' }, 'clases_valor_residual'],
  ] as const)('rechaza %s (check)', async (_caso, cambios, restriccion) => {
    const error = await errorDePostgres(insertarClase(clase(empresaA1, cambios as never)));

    expect(error?.constraint).toBe(restriccion);
  });

  it('un terreno válido lleva porcentaje 0 y sin vida útil', async () => {
    await expect(
      insertarClase(clase(empresaA1, { nombre: 'Terrenos', incisoFiscal: 'terrenos', porcentajeFiscal: '0' })),
    ).resolves.toBeTruthy();
  });
});

describe('clases por concepto: seguridad y llaves', () => {
  it('liga un concepto a su clase y cada empresa ve solo lo suyo', async () => {
    await ligar(vehiculosA1, conceptoA1);

    const visibles = (empresaId: string) =>
      enTransaccionSegura(en(empresaId), (tx) => tx.select().from(clasesPorConcepto));

    expect(await visibles(empresaA1)).toHaveLength(1);
    expect(await visibles(empresaA2)).toEqual([]);
  });

  it('un concepto propone una sola clase (llave primaria)', async () => {
    const [otra] = await insertarClase(clase(empresaA1, { nombre: 'Otra' }));

    const error = await errorDePostgres(ligar(otra!.id, conceptoA1));

    expect(error?.constraint).toBe('clases_por_concepto_pk');
  });

  it('no se puede ligar la clase o el concepto de otra empresa (llaves compuestas)', async () => {
    const conceptoAjeno = await errorDePostgres(ligar(vehiculosA1, conceptoA2));
    const claseAjena = await errorDePostgres(
      enTransaccionSegura(en(empresaA2), (tx) =>
        tx
          .insert(clasesPorConcepto)
          .values({ empresaId: empresaA2, conceptoDeGastoId: conceptoA2, claseId: vehiculosA1 }),
      ),
    );

    expect(conceptoAjeno?.constraint).toBe('clases_por_concepto_concepto_fk');
    expect(claseAjena?.constraint).toBe('clases_por_concepto_clase_fk');
  });

  it('una clase con conceptos ligados no se elimina (llave sin cascada)', async () => {
    const intento = enTransaccionSegura(enA1(), (tx) => tx.delete(clases).where(eq(clases.id, vehiculosA1)));

    expect((await errorDePostgres(intento))?.code).toBe('23503');
  });

  it('al eliminar el concepto del libro se va su relación', async () => {
    const [otra] = await insertarClase(clase(empresaA1, { nombre: 'Maquinaria', porcentajeFiscal: '20' }));
    const concepto = await crearConcepto(enA1(), 'Maquinaria agrícola');
    await ligar(otra!.id, concepto);

    await enTransaccionSegura(enA1(), (tx) => tx.delete(conceptosDeGasto).where(eq(conceptosDeGasto.id, concepto)));

    const quedan = await enTransaccionSegura(enA1(), (tx) =>
      tx.select().from(clasesPorConcepto).where(eq(clasesPorConcepto.conceptoDeGastoId, concepto)),
    );
    expect(quedan).toEqual([]);
  });
});

describe('auditoría permanente del módulo (migración 0001)', () => {
  it('los seis recursos están en el catálogo, con la cita del Código Tributario', async () => {
    const filas = await comoPropietario<{ recurso: string; motivo: string }>(
      "select recurso, motivo from core.recursos_de_auditoria_permanente where recurso like 'activos-fijos.%' order by recurso",
    );

    expect(filas.map((fila) => fila.recurso)).toEqual([
      'activos-fijos.activos',
      'activos-fijos.bajas',
      'activos-fijos.cierres',
      'activos-fijos.costos',
      'activos-fijos.mejoras',
      'activos-fijos.saldos-iniciales',
    ]);
    for (const { motivo } of filas) expect(motivo).toContain('arts. 112 "A" y 47');
  });
});
