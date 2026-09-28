import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { AnularCheque } from '../aplicacion/casos-uso/cheques/anular-cheque.js';
import type { EmitirCheque } from '../aplicacion/casos-uso/cheques/emitir-cheque.js';
import type { SiguienteChequeDisponible } from '../aplicacion/casos-uso/cheques/siguiente-cheque-disponible.js';
import type {
  EmisionDeChequeSolicitada,
  ParamsCheque,
  ParamsCuentaBancariaDeCheques,
  SolicitudDeAnulacionDeCheque,
} from './cheques.esquemas-http.js';

export interface CasosDeUsoDeCheques {
  siguienteDisponible: SiguienteChequeDisponible;
  emitir: EmitirCheque;
  anular: AnularCheque;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class ChequesControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeCheques) {}

  siguienteDisponible = (solicitud: FastifyRequest<{ Params: ParamsCuentaBancariaDeCheques }>) =>
    this.casosDeUso.siguienteDisponible.ejecutar(operadorDe(solicitud), solicitud.params.cuentaBancariaId);

  emitir = (solicitud: FastifyRequest<{ Params: ParamsCheque; Body: EmisionDeChequeSolicitada }>) =>
    this.casosDeUso.emitir.ejecutar(operadorDe(solicitud), {
      ...solicitud.body,
      chequeId: solicitud.params.chequeId,
    });

  anular = (solicitud: FastifyRequest<{ Params: ParamsCheque; Body: SolicitudDeAnulacionDeCheque }>) =>
    this.casosDeUso.anular.ejecutar(operadorDe(solicitud), {
      chequeId: solicitud.params.chequeId,
      motivo: solicitud.body.motivo,
    });
}
