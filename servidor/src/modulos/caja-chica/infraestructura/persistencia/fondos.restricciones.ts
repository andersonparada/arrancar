import { sql } from 'drizzle-orm';
import { check, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { textoRecortado } from '../../../core/base-datos/restricciones.js';

/** Las columnas de `fondos` que usan estos checks. */
type T = Record<
  | 'nombre'
  | 'topePorComprobante'
  | 'origen'
  | 'fechaDeApertura'
  | 'estado'
  | 'fechaDeCierre'
  | 'cerradoEn'
  | 'cerradoPor'
  | 'motivoDeCierre'
  | 'observaciones',
  AnyPgColumn
>;

/** Reglas de forma de los datos del fondo. */
export const restriccionesDeLosDatosDelFondo = (t: T) => [
  check('fondos_nombre_valido', sql`${t.nombre} is not null and ${textoRecortado(t.nombre, 80)}`),
  check('fondos_tope_positivo', sql`${t.topePorComprobante} is null or ${t.topePorComprobante} > 0`),
  check('fondos_origen_valido', sql`${t.origen} in ('banco', 'saldo_inicial')`),
  check('fondos_observaciones_validas', textoRecortado(t.observaciones, 500)),
];

/** Estado y cierre: el fondo cerrado lleva los cuatro datos del cierre y los demás, ninguno. */
export const restriccionesDeCierreDelFondo = (t: T) => [
  check('fondos_estado_valido', sql`${t.estado} in ('abierto', 'cerrado')`),
  check(
    'fondos_cierre_completo',
    sql`(${t.estado} = 'cerrado') = (${t.fechaDeCierre} is not null) and (${t.fechaDeCierre} is not null) = (${t.cerradoEn} is not null) and (${t.cerradoEn} is not null) = (${t.cerradoPor} is not null) and (${t.cerradoPor} is not null) = (${t.motivoDeCierre} is not null)`,
  ),
  check('fondos_motivo_de_cierre_rango', textoRecortado(t.motivoDeCierre, 300)),
  check('fondos_fecha_de_cierre_valida', sql`${t.fechaDeCierre} is null or ${t.fechaDeCierre} >= ${t.fechaDeApertura}`),
];
