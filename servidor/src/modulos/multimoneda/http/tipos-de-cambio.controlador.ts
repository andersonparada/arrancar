import type { FastifyRequest } from 'fastify';
import type { ReporteDeTiposDeCambio } from '../aplicacion/casos-uso/reporte-de-tipos-de-cambio.js';
import type { FiltroDeTiposDeCambioSolicitado } from './tipos-de-cambio.esquemas-http.js';

export interface CasosDeUsoDeTiposDeCambio {
  reporte: ReporteDeTiposDeCambio;
}

/** Traduce la petición del reporte de tipos de cambio (solo lectura) al caso de uso. */
export class TiposDeCambioControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeTiposDeCambio) {}

  reporte = (solicitud: FastifyRequest<{ Querystring: FiltroDeTiposDeCambioSolicitado }>) =>
    this.casosDeUso.reporte.ejecutar(solicitud.query);
}
