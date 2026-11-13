import { sql } from 'drizzle-orm';
import { check, type AnyPgColumn } from 'drizzle-orm/pg-core';

/** Las columnas de `ajustes_de_saldo` que revisan sus restricciones. */
type T = Record<
  'monto' | 'causa' | 'motivo' | 'referencia' | 'estado' | 'anuladoEn' | 'anuladoPor' | 'motivoDeAnulacion',
  AnyPgColumn
>;

/** Monto, causa, motivo y referencia del ajuste. */
export const restriccionesDeValoresDelAjuste = (t: T) => [
  check('ajustes_monto_positivo', sql`${t.monto} > 0`),
  check(
    'ajustes_causa_valida',
    sql`${t.causa} in ('no_recuperable', 'diferencia_menor', 'compensado_con_otra_cuenta')`,
  ),
  check('ajustes_motivo_rango', sql`char_length(${t.motivo}) between 1 and 300`),
  check(
    'ajustes_referencia_valida',
    sql`${t.referencia} is null or (char_length(${t.referencia}) between 1 and 100 and ${t.referencia} = btrim(${t.referencia}))`,
  ),
  check(
    'ajustes_referencia_de_compensacion',
    sql`${t.causa} <> 'compensado_con_otra_cuenta' or ${t.referencia} is not null`,
  ),
];

/** Vigente o anulado, y lo anulado trae fecha, usuario y motivo. */
export const restriccionesDeEstadoDelAjuste = (t: T) => [
  check('ajustes_estado_valido', sql`${t.estado} in ('vigente', 'anulado')`),
  check(
    'ajustes_motivo_de_anulacion_rango',
    sql`${t.motivoDeAnulacion} is null or char_length(${t.motivoDeAnulacion}) between 1 and 300`,
  ),
  check(
    'ajustes_anulacion_completa',
    sql`(${t.estado} = 'anulado') = (${t.anuladoEn} is not null and ${t.anuladoPor} is not null and ${t.motivoDeAnulacion} is not null)`,
  ),
];
