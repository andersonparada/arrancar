import { sql } from 'drizzle-orm';
import { check, foreignKey, index, uniqueIndex, type AnyPgColumn, type ExtraConfigColumn } from 'drizzle-orm/pg-core';
import { CAUSAS_DE_DIVISION } from '../../dominio/division.js';
import { activos } from './activos.tablas.js';

type Columnas = Record<
  | 'empresaId'
  | 'activoOrigenId'
  | 'activoNuevoId'
  | 'codigoDelActivoNuevo'
  | 'cantidadOriginal'
  | 'cantidadSeparada'
  | 'causa'
  | 'motivo'
  | 'costoSeparado'
  | 'costoFiscalSeparado'
  | 'acumuladaContableSeparada'
  | 'acumuladaFiscalSeparada'
  | 'residualSeparado'
  | 'estado'
  | 'anuladoEn'
  | 'anuladoPor'
  | 'motivoDeAnulacion',
  AnyPgColumn
> &
  Record<'periodo', ExtraConfigColumn>;

const enSql = (valores: readonly string[]) => sql.raw(valores.map((valor) => `'${valor}'`).join(', '));

/**
 * Los dos activos son de la misma empresa que la división. La del nuevo se deja sin `on delete`: la migración la crea con
 * `on delete set null (activo_nuevo_id)` (PostgreSQL 16), porque drizzle no sabe poner la lista de columnas.
 */
export function llavesDeDivision(t: Columnas) {
  return [
    foreignKey({
      name: 'divisiones_origen_fk',
      columns: [t.activoOrigenId, t.empresaId],
      foreignColumns: [activos.id, activos.empresaId],
    }),
    foreignKey({
      name: 'divisiones_nuevo_fk',
      columns: [t.activoNuevoId, t.empresaId],
      foreignColumns: [activos.id, activos.empresaId],
    }),
  ];
}

/** El activo nuevo nace de una sola división; los índices buscan por origen y por mes (`acumuladaAl` y el cierre). */
export function indicesDeDivision(t: Columnas) {
  return [
    uniqueIndex('divisiones_nuevo_unico')
      .on(t.activoNuevoId)
      .where(sql`${t.activoNuevoId} is not null`),
    index('divisiones_origen_idx').on(t.activoOrigenId),
    index('divisiones_periodo_idx')
      .on(t.empresaId, t.periodo)
      .where(sql`${t.estado} = 'vigente'`),
  ];
}

/** Los checks de §5.15 que la base garantiza aunque se escriba sin pasar por el dominio. */
export function reglasDeDivision(t: Columnas) {
  return [...reglasDeIdentidad(t), ...reglasDeMontos(t)];
}

function reglasDeIdentidad(t: Columnas) {
  return [
    check('divisiones_estado', sql`${t.estado} in ('vigente', 'anulada')`),
    check('divisiones_causa', sql`${t.causa} in (${enSql(CAUSAS_DE_DIVISION)})`),
    check('divisiones_primer_dia', sql`extract(day from ${t.periodo}) = 1`),
    check('divisiones_cantidades', sql`${t.cantidadSeparada} >= 1 and ${t.cantidadSeparada} < ${t.cantidadOriginal}`),
    check('divisiones_nuevo_requerido', sql`${t.estado} = 'anulada' or ${t.activoNuevoId} is not null`),
    check('divisiones_nuevo_distinto', sql`${t.activoNuevoId} <> ${t.activoOrigenId}`),
    check(
      'divisiones_textos',
      sql`char_length(btrim(${t.codigoDelActivoNuevo})) between 1 and 30 and char_length(btrim(${t.motivo})) between 1 and 300`,
    ),
    check(
      'divisiones_anulacion_completa',
      sql`(${t.estado} = 'anulada') = (${t.anuladoEn} is not null and ${t.anuladoPor} is not null and ${t.motivoDeAnulacion} is not null)`,
    ),
  ];
}

function reglasDeMontos(t: Columnas) {
  return [
    check(
      'divisiones_montos',
      sql`${t.costoSeparado} >= 0 and ${t.costoFiscalSeparado} >= 0 and ${t.costoFiscalSeparado} <= ${t.costoSeparado}
        and ${t.acumuladaContableSeparada} >= 0 and ${t.acumuladaFiscalSeparada} >= 0 and ${t.residualSeparado} >= 0`,
    ),
    check(
      'divisiones_acumuladas',
      sql`${t.acumuladaContableSeparada} <= ${t.costoSeparado} and ${t.acumuladaFiscalSeparada} <= ${t.costoFiscalSeparado}`,
    ),
  ];
}
