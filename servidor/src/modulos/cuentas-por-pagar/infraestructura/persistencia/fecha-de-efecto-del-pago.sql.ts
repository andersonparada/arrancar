import { and, eq, sql, type SQL } from 'drizzle-orm';
import { conciliaciones } from '../../../bancos/infraestructura/persistencia/conciliaciones.tablas.js';
import { movimientos } from '../../../bancos/infraestructura/persistencia/movimientos.tablas.js';
import { pagos } from './pagos.tablas.js';

/**
 * Desde qué día rebaja el pago la deuda (`docs/modulos/diseno-cp5-reportes.md`, dictamen 5 «cobro anticipado»): su
 * fecha, o el último día del mes de la conciliación autorizada que marcó su cheque si fue anterior. Es la misma regla de
 * los reportes (`pagosAlCorte`), para que las pantallas de operación y R1/R2 den la misma deuda y el mismo comprometido.
 * Es el único lugar donde se escribe en SQL; la consulta debe traer unidas la conciliación (`unionDeLaConciliacion`).
 *
 * @param fecha la fecha del pago.
 * @param finDeMesCobrado el último día del mes de la conciliación autorizada; nulo si no hay.
 */
export const fechaDeEfectoDelPagoSql = (fecha: SQL, finDeMesCobrado: SQL): SQL =>
  sql`least(${fecha}, coalesce(${finDeMesCobrado}, ${fecha}))`;

/** El último día del mes de la conciliación autorizada que marcó el cheque (columnas de Drizzle). */
const finDeMesDeLaConciliacion = sql`(make_date(${conciliaciones.anio}, ${conciliaciones.mes}, 1) + interval '1 month' - interval '1 day')::date`;

/** La fecha de efecto con las tablas de Drizzle (`pagos`, y unidas `movimientos` y `conciliaciones`). */
export const fechaDeEfectoDelPago = fechaDeEfectoDelPagoSql(sql`${pagos.fecha}`, finDeMesDeLaConciliacion);

/** La condición para unir la conciliación autorizada del movimiento del pago. */
export const unionDeLaConciliacion = and(
  eq(conciliaciones.id, movimientos.conciliacionId),
  eq(conciliaciones.estado, 'autorizada'),
);
