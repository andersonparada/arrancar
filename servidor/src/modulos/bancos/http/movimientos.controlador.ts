import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ObtenerMovimiento } from '../aplicacion/casos-uso/movimientos/obtener-movimiento.js';
import type { ReporteDeMovimientos } from '../aplicacion/casos-uso/movimientos/reporte-de-movimientos.js';
import type { FiltroSolicitado, ParamsMovimiento } from './movimientos.esquemas-http.js';

export interface CasosDeUsoDeMovimientos {
  reporte: ReporteDeMovimientos;
  obtener: ObtenerMovimiento;
}

/** Movimientos queda de solo lectura: el reporte y una nota o un saldo inicial por id. */
export class MovimientosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeMovimientos) {}

  reporte = (solicitud: FastifyRequest<{ Querystring: FiltroSolicitado }>) =>
    this.casosDeUso.reporte.ejecutar(operadorDe(solicitud), solicitud.query);

  obtener = (solicitud: FastifyRequest<{ Params: ParamsMovimiento }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.movimientoId);
}
