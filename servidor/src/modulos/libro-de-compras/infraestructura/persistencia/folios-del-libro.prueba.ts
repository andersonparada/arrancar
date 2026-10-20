/**
 * Prueba de integración contra PostgreSQL (base de pruebas): los folios del libro. Seguridad por empresa, `check`,
 * folios sin traslape, historial de solo agregar y que todo se deshaga junto si la transacción falla.
 */
import { eq } from 'drizzle-orm';
import pg, { DatabaseError } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../../../../configuracion.js';
import { bd, grupoConexiones } from '../../../core/base-datos/conexion.js';
import { migrarModulos } from '../../../core/base-datos/migrador.js';
import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import { interpretarErrorDePostgres } from '../../../core/compartido/infraestructura/errores-de-postgres.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { cuentas } from '../../../core/cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { definicionesModulos } from '../../../indice.js';
import { emisionesDelLibro, foliacionDelLibro } from './folios-del-libro.tablas.js';

let usuarioId: string;
let cuentaA: string;
let empresaA1: string;
let empresaA2: string;

const en = (empresaId: string): ContextoEmpresa => ({ empresaId, cuentaId: cuentaA, usuarioId });

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

const emision = (empresaId: string, cambios: Record<string, unknown> = {}) => ({
  empresaId,
  periodo: '2026-10-01',
  tipoDeLibro: 'completo',
  folioDesde: 1,
  folioHasta: 3,
  paginas: 3,
  huellaDeDatos: 'a'.repeat(64),
  versionDePlantilla: 1,
  totales: { total: '0.00' },
  ...cambios,
});

const agregar = (empresaId: string, cambios: Record<string, unknown> = {}) =>
  enTransaccionSegura(en(empresaId), (tx) => tx.insert(emisionesDelLibro).values(emision(empresaId, cambios)));

const emisionesDe = (empresaId: string) =>
  enTransaccionSegura(en(empresaId), (tx) => tx.select().from(emisionesDelLibro));

beforeAll(async () => {
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  await conexion.query('truncate core.cuentas, core.usuarios cascade');
  await conexion.end();
  const [cuenta] = await bd.insert(cuentas).values({ nombre: 'Cuenta folios' }).returning();
  const [usuario] = await bd
    .insert(usuarios)
    .values({ usuario: 'folios', nombres: 'Folios', hashContrasena: 'x' })
    .returning();
  const filas = await bd
    .insert(empresas)
    .values([
      { cuentaId: cuenta!.id, nombre: 'Empresa 1' },
      { cuentaId: cuenta!.id, nombre: 'Empresa 2' },
    ])
    .returning();
  cuentaA = cuenta!.id;
  usuarioId = usuario!.id;
  [empresaA1, empresaA2] = filas.map((fila) => fila.id) as [string, string];
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('foliacion_del_libro', () => {
  it('el último folio no puede ser negativo (check) y cada empresa ve solo el suyo', async () => {
    const negativo = await errorDePostgres(
      enTransaccionSegura(en(empresaA1), (tx) =>
        tx.insert(foliacionDelLibro).values({ empresaId: empresaA1, ultimoFolio: -1 }),
      ),
    );
    await enTransaccionSegura(en(empresaA1), (tx) =>
      tx.insert(foliacionDelLibro).values({ empresaId: empresaA1, ultimoFolio: 7 }),
    );

    const vistoPorA2 = await enTransaccionSegura(en(empresaA2), (tx) => tx.select().from(foliacionDelLibro));

    expect(negativo?.constraint).toBe('foliacion_del_libro_folio_no_negativo');
    expect(vistoPorA2).toEqual([]);
  });

  it('una empresa no puede escribir la fila de otra', async () => {
    const ajena = await errorDePostgres(
      enTransaccionSegura(en(empresaA2), (tx) => tx.insert(foliacionDelLibro).values({ empresaId: empresaA1 })),
    );

    expect(ajena?.code).toBe('42501');
  });
});

describe('emisiones_del_libro: restricciones', () => {
  it('guarda una emisión y solo su empresa la ve', async () => {
    await agregar(empresaA1);

    expect(await emisionesDe(empresaA1)).toHaveLength(1);
    expect(await emisionesDe(empresaA2)).toEqual([]);
  });

  it('dos emisiones de la empresa no pueden traslapar folios', async () => {
    const traslapada = await errorDePostgres(agregar(empresaA1, { folioDesde: 3, folioHasta: 5, paginas: 3 }));
    const dentro = await errorDePostgres(agregar(empresaA1, { folioDesde: 2, folioHasta: 2, paginas: 1 }));

    expect(traslapada?.constraint).toBe('emisiones_del_libro_sin_traslape');
    expect(dentro?.constraint).toBe('emisiones_del_libro_sin_traslape');
    expect(interpretarErrorDePostgres(traslapada)?.message).toBe(
      'Esos folios del libro ya fueron usados por otra emisión.',
    );
  });

  it('el mismo folio de inicio tampoco se repite, pero otra empresa puede usar los mismos folios', async () => {
    const repetido = await errorDePostgres(agregar(empresaA1, { folioHasta: 1, paginas: 1 }));

    expect(repetido?.constraint).toBe('emisiones_del_libro_folio_unico');
    await expect(agregar(empresaA2)).resolves.toBeTruthy();
  });

  it('folios seguidos sí caben', async () => {
    await expect(agregar(empresaA1, { folioDesde: 4, folioHasta: 5, paginas: 2 })).resolves.toBeTruthy();
  });

  it('cada check rechaza su caso', async () => {
    const constraint = async (cambios: Record<string, unknown>) =>
      (await errorDePostgres(agregar(empresaA1, cambios)))?.constraint;

    expect(await constraint({ folioDesde: 20, folioHasta: 22, paginas: 2 })).toBe(
      'emisiones_del_libro_paginas_cuadran',
    );
    expect(await constraint({ folioDesde: 0, folioHasta: 2, paginas: 3 })).toBe('emisiones_del_libro_folios_validos');
    expect(await constraint({ folioDesde: 30, folioHasta: 30, paginas: 1, periodo: '2026-10-15' })).toBe(
      'emisiones_del_libro_periodo_primer_dia',
    );
    expect(await constraint({ folioDesde: 31, folioHasta: 31, paginas: 1, tipoDeLibro: 'otro' })).toBe(
      'emisiones_del_libro_tipo_valido',
    );
    expect(await constraint({ folioDesde: 32, folioHasta: 32, paginas: 1, motivo: '' })).toBe(
      'emisiones_del_libro_motivo_valido',
    );
  });
});

describe('emisiones_del_libro: historial de solo agregar', () => {
  it('cambiar o borrar una emisión no toca ninguna fila', async () => {
    const cambiadas = await enTransaccionSegura(en(empresaA1), (tx) =>
      tx
        .update(emisionesDelLibro)
        .set({ motivo: 'Cambiado' })
        .where(eq(emisionesDelLibro.empresaId, empresaA1))
        .returning(),
    );
    const borradas = await enTransaccionSegura(en(empresaA1), (tx) =>
      tx.delete(emisionesDelLibro).where(eq(emisionesDelLibro.empresaId, empresaA1)).returning(),
    );

    expect(cambiadas).toEqual([]);
    expect(borradas).toEqual([]);
    expect((await emisionesDe(empresaA1)).every((fila) => fila.motivo === null)).toBe(true);
  });
});

describe('emitir es una sola transacción', () => {
  it('si algo falla después de gastar folios, ni la emisión ni el último folio quedan', async () => {
    const antes = (await emisionesDe(empresaA1)).length;

    await expect(
      enTransaccionSegura(en(empresaA1), async (tx) => {
        await tx.insert(emisionesDelLibro).values(emision(empresaA1, { folioDesde: 40, folioHasta: 41, paginas: 2 }));
        await tx.update(foliacionDelLibro).set({ ultimoFolio: 41 }).where(eq(foliacionDelLibro.empresaId, empresaA1));
        throw new Error('falla después de gastar los folios');
      }),
    ).rejects.toThrow('falla después');

    const [foliacion] = await enTransaccionSegura(en(empresaA1), (tx) => tx.select().from(foliacionDelLibro));
    expect(await emisionesDe(empresaA1)).toHaveLength(antes);
    expect(foliacion?.ultimoFolio).toBe(7);
  });
});
