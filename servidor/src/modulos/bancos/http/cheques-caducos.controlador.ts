import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ReporteDeChequesCaducos } from '../aplicacion/casos-uso/cheques/reporte-de-cheques-caducos.js';
import type { FiltroDeChequesCaducosSolicitado } from './cheques-caducos.esquemas-http.js';

export interface CasosDeUsoDeChequesCaducos {
  reporte: ReporteDeChequesCaducos;
}

/** Traduce la petición del reporte de cheques caducos (solo lectura) al caso de uso. */
export class ChequesCaducosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeChequesCaducos) {}

  reporte = (solicitud: FastifyRequest<{ Querystring: FiltroDeChequesCaducosSolicitado }>) =>
    this.casosDeUso.reporte.ejecutar(operadorDe(solicitud), solicitud.query);
}
