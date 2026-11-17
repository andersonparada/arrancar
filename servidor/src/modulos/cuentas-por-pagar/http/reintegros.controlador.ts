import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { AnularReintegro } from '../aplicacion/casos-uso/reintegros/anular-reintegro.js';
import type {
  ObtenerReintegro,
  ReciboDeReintegro,
} from '../aplicacion/casos-uso/reintegros/consultas-de-reintegros.js';
import type { RegistrarReintegro } from '../aplicacion/casos-uso/reintegros/registrar-reintegro.js';
import type { AnularReintegroSolicitado, ParamsDeReintegro, ReintegroSolicitado } from './reintegros.esquemas-http.js';

export interface CasosDeUsoDeReintegros {
  registrar: RegistrarReintegro;
  obtener: ObtenerReintegro;
  recibo: ReciboDeReintegro;
  anular: AnularReintegro;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class ReintegrosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeReintegros) {}

  registrar = async (solicitud: FastifyRequest<{ Body: ReintegroSolicitado }>, respuesta: FastifyReply) => {
    const reintegro = await this.casosDeUso.registrar.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(reintegro);
  };

  obtener = (solicitud: FastifyRequest<{ Params: ParamsDeReintegro }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.id);

  recibo = (solicitud: FastifyRequest<{ Params: ParamsDeReintegro }>) =>
    this.casosDeUso.recibo.ejecutar(operadorDe(solicitud), solicitud.params.id);

  anular = (solicitud: FastifyRequest<{ Params: ParamsDeReintegro; Body: AnularReintegroSolicitado }>) =>
    this.casosDeUso.anular.ejecutar(operadorDe(solicitud), { reintegroId: solicitud.params.id, ...solicitud.body });
}
