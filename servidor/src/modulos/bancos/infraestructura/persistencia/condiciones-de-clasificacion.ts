import { and, isNull, eq } from 'drizzle-orm';
import { conceptos } from './conceptos.tablas.js';
import { movimientos } from './movimientos.tablas.js';

/**
 * Un pendiente de la bandeja: original vigente con el concepto de sistema «Sin clasificar», sin origen en otro
 * módulo, sin transferencia y que no es el saldo inicial. La comparten el reporte y las sugerencias para no divergir.
 * Necesita `conceptos` unido a `movimientos`.
 */
export const esPendienteDeClasificar = and(
  eq(conceptos.claveDeSistema, 'sin_clasificar'),
  isNull(movimientos.revierteAId),
  isNull(movimientos.anuladoEn),
  isNull(movimientos.transferenciaId),
  eq(movimientos.saldoInicial, false),
  isNull(movimientos.moduloDeOrigen),
);
