import { sql, type SQL } from 'drizzle-orm';
import { check, type AnyPgColumn } from 'drizzle-orm/pg-core';

/** Texto sin espacios a los lados y de 1 a `maximo` caracteres, para un `check` (si es nulo, lo deja pasar). */
export const textoRecortado = (columna: AnyPgColumn, maximo: number): SQL =>
  sql`(${columna} is null or (char_length(${columna}) between 1 and ${sql.raw(String(maximo))} and ${columna} = btrim(${columna})))`;

/** Las columnas de la anulación que revisan estas restricciones. */
type ColumnasDeAnulacion = Record<
  'estado' | 'fecha' | 'fechaDeAnulacion' | 'anuladoEn' | 'anuladoPor' | 'motivoDeAnulacion',
  AnyPgColumn
>;

/**
 * La anulación se escribe completa o no se escribe (quién, cuándo y por qué), el motivo es de 1 a 300 caracteres y la
 * fecha contable de la anulación va si y solo si el registro está anulado. `valorAnulado` es el estado que significa
 * anulado (`anulado`, `anulada`); `prefijo` nombra los `check` (`reposiciones`, `anticipos`).
 */
export const restriccionesDeAnulacion = (prefijo: string, t: ColumnasDeAnulacion, valorAnulado = 'anulado') => {
  const anulado = sql.raw(`'${valorAnulado.replace(/[^a-z_]/g, '')}'`);
  return [
    check(
      `${prefijo}_anulacion_completa`,
      sql`(${t.estado} = ${anulado}) = (${t.anuladoEn} is not null) and (${t.anuladoEn} is not null) = (${t.anuladoPor} is not null) and (${t.anuladoPor} is not null) = (${t.motivoDeAnulacion} is not null)`,
    ),
    check(
      `${prefijo}_motivo_de_anulacion_rango`,
      sql`${t.motivoDeAnulacion} is null or char_length(${t.motivoDeAnulacion}) between 1 and 300`,
    ),
    check(
      `${prefijo}_fecha_de_anulacion_de_su_estado`,
      sql`(${t.estado} = ${anulado}) = (${t.fechaDeAnulacion} is not null)`,
    ),
  ];
};

/** La fecha contable de la anulación no es anterior a la fecha del registro. */
export const fechaDeAnulacionPosterior = (
  prefijo: string,
  t: Pick<ColumnasDeAnulacion, 'fecha' | 'fechaDeAnulacion'>,
) =>
  check(
    `${prefijo}_fecha_de_anulacion_valida`,
    sql`${t.fechaDeAnulacion} is null or ${t.fechaDeAnulacion} >= ${t.fecha}`,
  );
