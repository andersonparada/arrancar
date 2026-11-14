import { sql } from 'drizzle-orm';
import { check, type AnyPgColumn } from 'drizzle-orm/pg-core';

/** Las columnas de `reintegros` que usan estos checks. */
type T = Record<'numero' | 'forma' | 'monto' | 'movimientoId' | 'referencia', AnyPgColumn>;

/** Valores del reintegro y lo que lleva cada forma: el depósito, un movimiento; el efectivo, su recibo. */
export const restriccionesDeReintegro = (t: T) => [
  check('reintegros_numero_positivo', sql`${t.numero} > 0`),
  check('reintegros_forma_valida', sql`${t.forma} in ('deposito', 'efectivo')`),
  check('reintegros_monto_positivo', sql`${t.monto} > 0`),
  check('reintegros_movimiento_de_su_forma', sql`(${t.forma} = 'deposito') = (${t.movimientoId} is not null)`),
  check('reintegros_referencia_en_efectivo', sql`${t.forma} <> 'efectivo' or ${t.referencia} is not null`),
  check(
    'reintegros_referencia_valida',
    sql`${t.referencia} is null or (char_length(${t.referencia}) between 1 and 100 and ${t.referencia} = btrim(${t.referencia}))`,
  ),
];
