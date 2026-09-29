import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ReporteDeIntereses } from '../aplicacion/casos-uso/reportes-por-concepto/reporte-de-intereses.js';
import type { FiltroDeInteresesSolicitado } from './intereses.esquemas-http.js';

export interface CasosDeUsoDeIntereses {
  reporte: ReporteDeIntereses;
}

/** Traduce la petición del reporte de intereses y retenciones (solo lectura) al caso de uso. */
export class InteresesControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeIntereses) {}

  reporte = (solicitud: FastifyRequest<{ Querystring: FiltroDeInteresesSolicitado }>) =>
    this.casosDeUso.reporte.ejecutar(operadorDe(solicitud), solicitud.query);
}
