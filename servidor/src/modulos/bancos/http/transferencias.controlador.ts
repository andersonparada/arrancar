import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { AnularTransferencia } from '../aplicacion/casos-uso/transferencias/anular-transferencia.js';
import type { ListarTransferencias } from '../aplicacion/casos-uso/transferencias/listar-transferencias.js';
import type { ObtenerTransferencia } from '../aplicacion/casos-uso/transferencias/obtener-transferencia.js';
import type { RegistrarTransferencia } from '../aplicacion/casos-uso/transferencias/registrar-transferencia.js';
import type {
  FiltroDeTransferenciasSolicitado,
  ParamsTransferencia,
  SolicitudDeAnulacionDeTransferencia,
  TransferenciaSolicitada,
} from './transferencias.esquemas-http.js';

export interface CasosDeUsoDeTransferencias {
  registrar: RegistrarTransferencia;
  obtener: ObtenerTransferencia;
  anular: AnularTransferencia;
  listar: ListarTransferencias;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class TransferenciasControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeTransferencias) {}

  listar = (solicitud: FastifyRequest<{ Querystring: FiltroDeTransferenciasSolicitado }>) =>
    this.casosDeUso.listar.ejecutar(operadorDe(solicitud), solicitud.query);

  registrar = async (solicitud: FastifyRequest<{ Body: TransferenciaSolicitada }>, respuesta: FastifyReply) => {
    const transferencia = await this.casosDeUso.registrar.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(transferencia);
  };

  obtener = (solicitud: FastifyRequest<{ Params: ParamsTransferencia }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.transferenciaId);

  anular = (solicitud: FastifyRequest<{ Params: ParamsTransferencia; Body: SolicitudDeAnulacionDeTransferencia }>) =>
    this.casosDeUso.anular.ejecutar(operadorDe(solicitud), {
      transferenciaId: solicitud.params.transferenciaId,
      motivo: solicitud.body.motivo,
    });
}
