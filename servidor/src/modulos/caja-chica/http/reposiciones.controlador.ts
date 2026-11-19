import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { AnularReposicion } from '../aplicacion/casos-uso/reposiciones/anular-reposicion.js';
import type {
  ListarReposiciones,
  ObtenerReposicion,
  SolicitarReposicion,
} from '../aplicacion/casos-uso/reposiciones/consultas-de-reposiciones.js';
import type { RegistrarReposicion } from '../aplicacion/casos-uso/reposiciones/registrar-reposicion.js';
import type { ParamsDeFondo } from './fondos.esquemas-http.js';
import type {
  AnularReposicionSolicitada,
  ParamsDeReposicion,
  ReposicionSolicitada,
} from './reposiciones.esquemas-http.js';

export interface CasosDeUsoDeReposiciones {
  listar: ListarReposiciones;
  obtener: ObtenerReposicion;
  solicitud: SolicitarReposicion;
  registrar: RegistrarReposicion;
  anular: AnularReposicion;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class ReposicionesControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeReposiciones) {}

  listar = (solicitud: FastifyRequest<{ Params: ParamsDeFondo }>) =>
    this.casosDeUso.listar.ejecutar(operadorDe(solicitud), solicitud.params.id);

  solicitud = (solicitud: FastifyRequest<{ Params: ParamsDeFondo }>) =>
    this.casosDeUso.solicitud.ejecutar(operadorDe(solicitud), solicitud.params.id);

  obtener = (solicitud: FastifyRequest<{ Params: ParamsDeReposicion }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.id);

  registrar = async (
    solicitud: FastifyRequest<{ Params: ParamsDeFondo; Body: ReposicionSolicitada }>,
    respuesta: FastifyReply,
  ) => {
    const reposicion = await this.casosDeUso.registrar.ejecutar(operadorDe(solicitud), {
      ...solicitud.body,
      fondoId: solicitud.params.id,
    });
    return respuesta.status(201).send(reposicion);
  };

  anular = (solicitud: FastifyRequest<{ Params: ParamsDeReposicion; Body: AnularReposicionSolicitada }>) =>
    this.casosDeUso.anular.ejecutar(operadorDe(solicitud), {
      reposicionId: solicitud.params.id,
      ...solicitud.body,
    });
}
