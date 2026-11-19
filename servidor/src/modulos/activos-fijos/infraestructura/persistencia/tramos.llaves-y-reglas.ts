import { sql } from 'drizzle-orm';
import { check, foreignKey, index, uniqueIndex, type AnyPgColumn, type ExtraConfigColumn } from 'drizzle-orm/pg-core';
import { CAUSAS_DE_TRAMO } from '../../dominio/depreciacion/tramo.js';
import { activos } from './activos.tablas.js';

type Columnas = Record<
  | 'empresaId'
  | 'activoId'
  | 'libro'
  | 'causa'
  | 'porDepreciar'
  | 'valorResidual'
  | 'meses'
  | 'porcentaje'
  | 'baseDelPorcentaje'
  | 'cuotaMensual'
  | 'excesoDeNotaDeCredito'
  | 'vigente',
  AnyPgColumn
> &
  Record<'desdePeriodo', ExtraConfigColumn>;

const enSql = (valores: readonly string[]) => sql.raw(valores.map((valor) => `'${valor}'`).join(', '));

/** El activo es de la misma empresa que el tramo. */
export function llavesDeTramo(t: Columnas) {
  return [
    foreignKey({
      name: 'tramos_activo_fk',
      columns: [t.activoId, t.empresaId],
      foreignColumns: [activos.id, activos.empresaId],
    }),
  ];
}

/** Un solo tramo vigente por activo, libro y mes; y el índice que busca el que rige un mes. */
export function indicesDeTramo(t: Columnas) {
  return [
    uniqueIndex('tramos_vigente_unico')
      .on(t.activoId, t.libro, t.desdePeriodo)
      .where(sql`${t.vigente}`),
    index('tramos_activo_libro_idx')
      .on(t.activoId, t.libro, t.desdePeriodo.desc())
      .where(sql`${t.vigente}`),
  ];
}

/** Los checks de §5.8 que la base garantiza aunque se escriba sin pasar por el dominio. */
export function reglasDeTramo(t: Columnas) {
  return [
    check('tramos_libro', sql`${t.libro} in ('contable', 'fiscal')`),
    check('tramos_causa', sql`${t.causa} in (${enSql(CAUSAS_DE_TRAMO)})`),
    check('tramos_causa_de_matricula_fiscal', sql`${t.causa} <> 'cambio_de_matricula' or ${t.libro} = 'fiscal'`),
    check('tramos_primer_dia', sql`extract(day from ${t.desdePeriodo}) = 1`),
    check(
      'tramos_montos',
      sql`${t.porDepreciar} >= 0 and ${t.valorResidual} >= 0 and ${t.cuotaMensual} >= 0 and ${t.excesoDeNotaDeCredito} >= 0`,
    ),
    check('tramos_residual_fiscal', sql`${t.libro} <> 'fiscal' or ${t.valorResidual} = 0`),
    check('tramos_meses_contables', sql`(${t.libro} = 'contable') = (${t.meses} is not null)`),
    check(
      'tramos_porcentaje_fiscal',
      sql`(${t.libro} = 'fiscal') = (${t.porcentaje} is not null and ${t.baseDelPorcentaje} is not null)`,
    ),
  ];
}
