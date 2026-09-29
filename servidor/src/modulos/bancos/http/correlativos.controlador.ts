import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ReporteDeCorrelativos } from '../aplicacion/casos-uso/correlativos/reporte-de-correlativos.js';
import type { FiltroDeCorrelativosSolicitado } from './correlativos.esquemas-http.js';

export interface CasosDeUsoDeCorrelativos {
  reporte: ReporteDeCorrelativos;
}

/** Traduce la petición del reporte de correlativos (solo lectura) al caso de uso. */
export class CorrelativosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeCorrelativos) {}

  reporte = (solicitud: FastifyRequest<{ Querystring: FiltroDeCorrelativosSolicitado }>) =>
    this.casosDeUso.reporte.ejecutar(operadorDe(solicitud), solicitud.query);
}
