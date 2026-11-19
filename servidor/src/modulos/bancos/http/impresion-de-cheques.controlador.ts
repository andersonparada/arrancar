import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { HistorialDeImpresiones } from '../aplicacion/casos-uso/impresion-de-cheques/historial-de-impresiones.js';
import type { ImprimirCheques } from '../aplicacion/casos-uso/impresion-de-cheques/imprimir-cheques.js';
import type { ReimprimirCheque } from '../aplicacion/casos-uso/impresion-de-cheques/reimprimir-cheque.js';
import type { VistaPreviaDeImpresion } from '../aplicacion/casos-uso/impresion-de-cheques/vista-previa-de-impresion.js';
import type {
  ImpresionDeChequesSolicitada,
  ParamsChequeImpreso,
  ReimpresionDeChequeSolicitada,
  VistaDeImpresionSolicitada,
} from './impresion-de-cheques.esquemas-http.js';

export interface CasosDeUsoDeImpresionDeCheques {
  vistaPrevia: VistaPreviaDeImpresion;
  imprimir: ImprimirCheques;
  reimprimir: ReimprimirCheque;
  historial: HistorialDeImpresiones;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class ImpresionDeChequesControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeImpresionDeCheques) {}

  vistaPrevia = (solicitud: FastifyRequest<{ Querystring: VistaDeImpresionSolicitada }>) =>
    this.casosDeUso.vistaPrevia.ejecutar(operadorDe(solicitud), solicitud.query.ids);

  imprimir = (solicitud: FastifyRequest<{ Body: ImpresionDeChequesSolicitada }>) =>
    this.casosDeUso.imprimir.ejecutar(operadorDe(solicitud), solicitud.body.ids);

  reimprimir = (solicitud: FastifyRequest<{ Params: ParamsChequeImpreso; Body: ReimpresionDeChequeSolicitada }>) =>
    this.casosDeUso.reimprimir.ejecutar(operadorDe(solicitud), {
      ...solicitud.body,
      chequeId: solicitud.params.chequeId,
    });

  historial = (solicitud: FastifyRequest<{ Params: ParamsChequeImpreso }>) =>
    this.casosDeUso.historial.ejecutar(operadorDe(solicitud), solicitud.params.chequeId);
}
