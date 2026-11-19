import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { CancelarAvisoDePago } from '../aplicacion/casos-uso/avisos-de-pago/cancelar-aviso-de-pago.js';
import type { EnviarAvisoDePago } from '../aplicacion/casos-uso/avisos-de-pago/enviar-aviso-de-pago.js';
import type { PrepararAvisoDePago } from '../aplicacion/casos-uso/avisos-de-pago/preparar-aviso-de-pago.js';
import type {
  CancelacionDeAvisoSolicitada,
  EnvioDeAvisoSolicitado,
  ParamsDeAviso,
  ParamsDeAvisoCorreo,
} from './avisos-de-pago.esquemas-http.js';

export interface CasosDeUsoDeAvisosDePago {
  preparar: PrepararAvisoDePago;
  enviar: EnviarAvisoDePago;
  cancelar: CancelarAvisoDePago;
}

/** Traduce el aviso de pago por correo (ver, enviar y cancelar) a casos de uso; no contiene reglas de negocio. */
export class AvisosDePagoControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeAvisosDePago) {}

  obtener = (solicitud: FastifyRequest<{ Params: ParamsDeAviso }>) =>
    this.casosDeUso.preparar.ejecutar(operadorDe(solicitud), solicitud.params.id);

  enviar = async (
    solicitud: FastifyRequest<{ Params: ParamsDeAviso; Body: EnvioDeAvisoSolicitado }>,
    respuesta: FastifyReply,
  ) => {
    const correo = await this.casosDeUso.enviar.ejecutar(operadorDe(solicitud), solicitud.params.id, solicitud.body);
    return respuesta.status(201).send(correo);
  };

  cancelar = (solicitud: FastifyRequest<{ Params: ParamsDeAvisoCorreo; Body: CancelacionDeAvisoSolicitada }>) =>
    this.casosDeUso.cancelar.ejecutar(operadorDe(solicitud), solicitud.params.id, {
      correoId: solicitud.params.correoId,
      motivo: solicitud.body.motivo,
    });
}
