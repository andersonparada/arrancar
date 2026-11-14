import { sql } from 'drizzle-orm';
import { check, type AnyPgColumn } from 'drizzle-orm/pg-core';

/** Las columnas de la anulación y de las observaciones que revisan estas restricciones. */
type T = Record<'observaciones' | 'estado' | 'anuladoEn' | 'anuladoPor' | 'motivoDeAnulacion', AnyPgColumn>;

/** Observaciones, estado y anulación completa o ausente, con el prefijo de la tabla (`pagos`, `reintegros`). */
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
];
