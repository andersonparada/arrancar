import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../compartido/http/operador-de-la-solicitud.js';
import type { CancelarCorreo } from '../aplicacion/casos-uso/cancelar-correo.js';
import type { ListarCorreos } from '../aplicacion/casos-uso/listar-correos.js';
import type { ObtenerCorreo } from '../aplicacion/casos-uso/obtener-correo.js';
import type { ReintentarCorreo } from '../aplicacion/casos-uso/reintentar-correo.js';
import type {
  CancelacionDeCorreoSolicitada,
  FiltroDeCorreosSolicitado,
  ParamsDeCorreo,
} from './correos.esquemas-http.js';

export interface CasosDeUsoDeCorreos {
  listar: ListarCorreos;
  obtener: ObtenerCorreo;
  cancelar: CancelarCorreo;
  reintentar: ReintentarCorreo;
}

/** El historial de correos de la empresa activa. */
export class CorreosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeCorreos) {}

  listar = (solicitud: FastifyRequest<{ Querystring: FiltroDeCorreosSolicitado }>) =>
    this.casosDeUso.listar.ejecutar(operadorDe(solicitud), solicitud.query);

  obtener = (solicitud: FastifyRequest<{ Params: ParamsDeCorreo }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.id);

  cancelar = (solicitud: FastifyRequest<{ Params: ParamsDeCorreo; Body: CancelacionDeCorreoSolicitada }>) =>
    this.casosDeUso.cancelar.ejecutar(operadorDe(solicitud), solicitud.params.id, solicitud.body.motivo);

  reintentar = (solicitud: FastifyRequest<{ Params: ParamsDeCorreo }>) =>
    this.casosDeUso.reintentar.ejecutar(operadorDe(solicitud), solicitud.params.id);
}
