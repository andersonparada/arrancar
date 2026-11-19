import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ReporteDeCorrelativosDeCheques } from '../aplicacion/casos-uso/chequeras/reporte-de-correlativos-de-cheques.js';
import type {
  FiltroDeCorrelativosDeChequesSolicitado,
  ParamsCorrelativosDeCheques,
} from './correlativos-de-cheques.esquemas-http.js';

/** Traduce la petición del reporte de correlativos de cheques (solo lectura) a su caso de uso. */
export class CorrelativosDeChequesControlador {
  constructor(private readonly reporte: ReporteDeCorrelativosDeCheques) {}

  reporteDeCorrelativos = (
    solicitud: FastifyRequest<{
      Params: ParamsCorrelativosDeCheques;
      Querystring: FiltroDeCorrelativosDeChequesSolicitado;
    }>,
  ) => this.reporte.ejecutar(operadorDe(solicitud), { ...solicitud.query, chequeraId: solicitud.params.chequeraId });
}
