import { sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { LineaDeDesgloseDto } from '../../aplicacion/dto/movimiento.dto.js';
import { conceptos } from './conceptos.tablas.js';
import { desgloseDeMovimientos } from './desglose-de-movimientos.tablas.js';
import { movimientos } from './movimientos.tablas.js';

const conceptoDelDesglose = alias(conceptos, 'concepto_del_desglose');

/** El reparto por concepto del movimiento (vacío si no lo tiene), de la línea más grande a la más chica. */
export const desgloseDelMovimiento = sql<LineaDeDesgloseDto[]>`coalesce((
  select json_agg(json_build_object('conceptoId', ${desgloseDeMovimientos.conceptoId}, 'concepto', ${conceptoDelDesglose.nombre}, 'monto', (${desgloseDeMovimientos.monto})::text)
    order by ${desgloseDeMovimientos.monto} desc, ${conceptoDelDesglose.nombre})
  from ${desgloseDeMovimientos}
  inner join ${conceptos} ${sql.identifier('concepto_del_desglose')} on ${conceptoDelDesglose.id} = ${desgloseDeMovimientos.conceptoId}
  where ${desgloseDeMovimientos.movimientoId} = ${movimientos.id}
), '[]'::json)`;
