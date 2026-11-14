import { sql } from 'drizzle-orm';
import { check, type AnyPgColumn } from 'drizzle-orm/pg-core';

/** Las columnas de `contrasenas` que usan los checks. */
type T = Record<
  'numero' | 'fecha' | 'fechaDePago' | 'observaciones' | 'estado' | 'anuladaEn' | 'anuladaPor' | 'motivoDeAnulacion',
  AnyPgColumn
>;

/** Reglas de los valores de una contraseña y de su anulación (siempre completa o ausente). */
export const restriccionesDeContrasena = (t: T) => [
  check('contrasenas_numero_positivo', sql`${t.numero} > 0`),
  check('contrasenas_pago_desde_la_fecha', sql`${t.fechaDePago} >= ${t.fecha}`),
  check(
    'contrasenas_observaciones_validas',
    sql`${t.observaciones} is null or (char_length(${t.observaciones}) between 1 and 500 and ${t.observaciones} = btrim(${t.observaciones}))`,
  ),
  check('contrasenas_estado_valido', sql`${t.estado} in ('vigente', 'anulada')`),
  check(
    'contrasenas_anulacion_completa',
    sql`(${t.estado} = 'anulada') = (${t.anuladaEn} is not null and ${t.anuladaPor} is not null and ${t.motivoDeAnulacion} is not null)`,
  ),
  check(
    'contrasenas_motivo_rango',
    sql`${t.motivoDeAnulacion} is null or char_length(${t.motivoDeAnulacion}) between 1 and 300`,
  ),
];
