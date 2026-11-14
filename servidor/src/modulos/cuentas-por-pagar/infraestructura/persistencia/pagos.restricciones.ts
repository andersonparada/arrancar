import { sql } from 'drizzle-orm';
import { check, type AnyPgColumn } from 'drizzle-orm/pg-core';

/** Las columnas de `pagos` que usan estos checks. */
type T = Record<
  'numero' | 'forma' | 'monto' | 'movimientoId' | 'referencia' | 'motivo' | 'conCargaCerrada',
  AnyPgColumn
>;

/** Reglas de los valores de un pago y de lo que lleva cada forma (movimiento, referencia, motivo y carga). */
export const restriccionesDePago = (t: T) => [
  check('pagos_numero_positivo', sql`${t.numero} > 0`),
  check('pagos_forma_valida', sql`${t.forma} in ('cheque', 'nota_de_debito', 'nota_ligada', 'cuenta_de_apertura')`),
  check('pagos_monto_positivo', sql`${t.monto} > 0`),
  check('pagos_movimiento_de_su_forma', sql`(${t.forma} = 'cuenta_de_apertura') = (${t.movimientoId} is null)`),
  check(
    'pagos_referencia_de_su_forma',
    sql`${t.referencia} is null or ${t.forma} in ('nota_ligada', 'cuenta_de_apertura')`,
  ),
  check(
    'pagos_referencia_valida',
    sql`${t.referencia} is null or (char_length(${t.referencia}) between 1 and 100 and ${t.referencia} = btrim(${t.referencia}))`,
  ),
  check('pagos_motivo_de_apertura', sql`(${t.forma} = 'cuenta_de_apertura') = (${t.motivo} is not null)`),
  check('pagos_motivo_rango', sql`${t.motivo} is null or char_length(${t.motivo}) between 1 and 300`),
  check('pagos_carga_de_apertura', sql`(${t.forma} = 'cuenta_de_apertura') = (${t.conCargaCerrada} is not null)`),
];
