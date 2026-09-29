import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ReporteDeChequesCaducos } from '../aplicacion/casos-uso/cheques/reporte-de-cheques-caducos.js';
import type { AnularChequesCaducos } from '../aplicacion/casos-uso/cheques/anular-cheques-caducos.js';
import type { AnulacionEnLoteSolicitada, FiltroDeChequesCaducosSolicitado } from './cheques-caducos.esquemas-http.js';

export interface CasosDeUsoDeChequesCaducos {
  reporte: ReporteDeChequesCaducos;
  anularEnLote: AnularChequesCaducos;
}

/** Traduce la petición del reporte de cheques caducos y su anulación en lote al caso de uso. */
export class ChequesCaducosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeChequesCaducos) {}

  reporte = (solicitud: FastifyRequest<{ Querystring: FiltroDeChequesCaducosSolicitado }>) =>
    this.casosDeUso.reporte.ejecutar(operadorDe(solicitud), solicitud.query);

  anularEnLote = (solicitud: FastifyRequest<{ Body: AnulacionEnLoteSolicitada }>) =>
    this.casosDeUso.anularEnLote.ejecutar(operadorDe(solicitud), solicitud.body);
}
