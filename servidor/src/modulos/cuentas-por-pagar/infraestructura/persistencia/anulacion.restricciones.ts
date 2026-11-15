import { sql } from 'drizzle-orm';
import { check, type AnyPgColumn } from 'drizzle-orm/pg-core';

/** Las columnas de la anulación y de las observaciones que revisan estas restricciones. */
type T = Record<
  'observaciones' | 'estado' | 'fecha' | 'fechaDeAnulacion' | 'anuladoEn' | 'anuladoPor' | 'motivoDeAnulacion',
  AnyPgColumn
>;

/**
 * Observaciones, estado, anulación completa o ausente y fecha contable de la anulación (igual a `fecha` = «nunca
 * existió»), con el prefijo de la tabla (`pagos`,
 * `reintegros`).
 */
export const restriccionesDeEstadoYAnulacion = (prefijo: string, t: T) => [
  check(
    `${prefijo}_observaciones_validas`,
    sql`${t.observaciones} is null or (char_length(${t.observaciones}) between 1 and 500 and ${t.observaciones} = btrim(${t.observaciones}))`,
  ),
  check(`${prefijo}_estado_valido`, sql`${t.estado} in ('vigente', 'anulado')`),
  check(
    `${prefijo}_anulacion_completa`,
    sql`(${t.estado} = 'anulado') = (${t.anuladoEn} is not null and ${t.anuladoPor} is not null and ${t.motivoDeAnulacion} is not null)`,
  ),
  check(
    `${prefijo}_motivo_de_anulacion_rango`,
    sql`${t.motivoDeAnulacion} is null or char_length(${t.motivoDeAnulacion}) between 1 and 300`,
  ),
  ...restriccionesDeFechaDeAnulacion(prefijo, t),
];

/** La fecha contable de la anulación va si y solo si el registro está anulado, y no es anterior a su fecha. */
export const restriccionesDeFechaDeAnulacion = (
  prefijo: string,
  t: Pick<T, 'estado' | 'fecha' | 'fechaDeAnulacion'>,
) => [
  check(
    `${prefijo}_fecha_de_anulacion_de_su_estado`,
    sql`(${t.estado} = 'anulado') = (${t.fechaDeAnulacion} is not null)`,
  ),
  check(
    `${prefijo}_fecha_de_anulacion_valida`,
    sql`${t.fechaDeAnulacion} is null or ${t.fechaDeAnulacion} >= ${t.fecha}`,
  ),
];
