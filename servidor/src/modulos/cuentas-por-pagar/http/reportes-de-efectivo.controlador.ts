import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ReporteDeBancarizacion } from '../aplicacion/casos-uso/reportes/reporte-de-bancarizacion.js';
import type {
  ReporteDeNotasSinAplicar,
  ReporteDeRetirosPorLiquidar,
} from '../aplicacion/casos-uso/reportes/reportes-de-efectivo.js';
import type {
  FiltroDeBancarizacionSolicitado,
  FiltroDeNotasSinAplicarSolicitado,
  FiltroDeRetirosPorLiquidarSolicitado,
} from './reportes-de-efectivo.esquemas-http.js';

export interface CasosDeUsoDeReportesDeEfectivo {
  bancarizacion: ReporteDeBancarizacion;
  retirosPorLiquidar: ReporteDeRetirosPorLiquidar;
  notasSinAplicar: ReporteDeNotasSinAplicar;
}

/** Traduce las peticiones de R9, R10 y R11 (solo lectura) a sus casos de uso. */
export class ReportesDeEfectivoControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeReportesDeEfectivo) {}

  bancarizacion = (solicitud: FastifyRequest<{ Querystring: FiltroDeBancarizacionSolicitado }>) =>
    this.casosDeUso.bancarizacion.ejecutar(operadorDe(solicitud), solicitud.query);

  retirosPorLiquidar = (solicitud: FastifyRequest<{ Querystring: FiltroDeRetirosPorLiquidarSolicitado }>) =>
    this.casosDeUso.retirosPorLiquidar.ejecutar(operadorDe(solicitud), solicitud.query);

  notasSinAplicar = (solicitud: FastifyRequest<{ Querystring: FiltroDeNotasSinAplicarSolicitado }>) =>
    this.casosDeUso.notasSinAplicar.ejecutar(operadorDe(solicitud), solicitud.query);
}
