import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ReporteDeFlujoDeEfectivo } from '../aplicacion/casos-uso/reportes-por-concepto/reporte-de-flujo-de-efectivo.js';
import type { ReporteDeMovimientosPorConcepto } from '../aplicacion/casos-uso/reportes-por-concepto/reporte-de-movimientos-por-concepto.js';
import {
  aFiltroDeTotales,
  type FiltroDeFlujoSolicitado,
  type FiltroPorConceptoSolicitado,
} from './reportes-por-concepto.esquemas-http.js';

export interface CasosDeUsoDeReportesPorConcepto {
  flujoDeEfectivo: ReporteDeFlujoDeEfectivo;
  movimientosPorConcepto: ReporteDeMovimientosPorConcepto;
}

/** Traduce las peticiones de los dos reportes por concepto (solo lectura) a sus casos de uso. */
export class ReportesPorConceptoControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeReportesPorConcepto) {}

  flujoDeEfectivo = (solicitud: FastifyRequest<{ Querystring: FiltroDeFlujoSolicitado }>) =>
    this.casosDeUso.flujoDeEfectivo.ejecutar(operadorDe(solicitud), solicitud.query);

  movimientosPorConcepto = (solicitud: FastifyRequest<{ Querystring: FiltroPorConceptoSolicitado }>) =>
    this.casosDeUso.movimientosPorConcepto.ejecutar(operadorDe(solicitud), aFiltroDeTotales(solicitud.query));
}
