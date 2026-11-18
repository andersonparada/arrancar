import { sql } from 'drizzle-orm';
import { check, type AnyPgColumn } from 'drizzle-orm/pg-core';

/** Las columnas de `vales_provisionales` que usan estos checks. */
type T = Record<
  'fecha' | 'monto' | 'estado' | 'devuelto' | 'fechaDeLiquidacion' | 'liquidadoEn' | 'liquidadoPor',
  AnyPgColumn
>;

/** La liquidación del vale: completa, no anterior a la entrega, y lo devuelto dentro del monto. */
export const restriccionesDeLaLiquidacion = (t: T) => [
  check(
    'vales_liquidacion_completa',
    sql`(${t.estado} = 'liquidado') = (${t.fechaDeLiquidacion} is not null) and (${t.fechaDeLiquidacion} is not null) = (${t.liquidadoEn} is not null) and (${t.liquidadoEn} is not null) = (${t.liquidadoPor} is not null)`,
  ),
  check('vales_liquidacion_posterior', sql`${t.fechaDeLiquidacion} is null or ${t.fechaDeLiquidacion} >= ${t.fecha}`),
  check('vales_devuelto_valido', sql`${t.devuelto} >= 0 and ${t.devuelto} <= ${t.monto}`),
  check('vales_abierto_sin_devuelto', sql`${t.estado} = 'liquidado' or ${t.devuelto} = 0`),
];
