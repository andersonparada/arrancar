import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ReporteDeAnticiposPorLiquidar } from '../aplicacion/casos-uso/reportes/reporte-de-anticipos-por-liquidar.js';
import type { ReporteDeNoLiquidado } from '../aplicacion/casos-uso/reportes/reporte-de-no-liquidado.js';
import type {
  FiltroDeAnticiposPorLiquidarSolicitado,
  FiltroDeNoLiquidadoSolicitado,
} from './reportes.esquemas-http.js';

export interface CasosDeUsoDeReportes {
  anticiposPorLiquidar: ReporteDeAnticiposPorLiquidar;
  noLiquidado: ReporteDeNoLiquidado;
}

/** Traduce las peticiones de CL-R1 y CL-R2 (solo lectura) a sus casos de uso. */
export class ReportesDeLiquidarControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeReportes) {}

  anticiposPorLiquidar = (solicitud: FastifyRequest<{ Querystring: FiltroDeAnticiposPorLiquidarSolicitado }>) =>
    this.casosDeUso.anticiposPorLiquidar.ejecutar(operadorDe(solicitud), solicitud.query);

  noLiquidado = (solicitud: FastifyRequest<{ Querystring: FiltroDeNoLiquidadoSolicitado }>) =>
    this.casosDeUso.noLiquidado.ejecutar(operadorDe(solicitud), solicitud.query);
}
