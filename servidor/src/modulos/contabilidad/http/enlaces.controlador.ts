import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { GuardarEnlace } from '../aplicacion/casos-uso/enlaces/guardar-enlace.js';
import type { ListarEnlaces } from '../aplicacion/casos-uso/enlaces/listar-enlaces.js';
import type { ListarLlavesDeEnlace } from '../aplicacion/casos-uso/enlaces/listar-llaves-de-enlace.js';
import type { QuitarEnlace } from '../aplicacion/casos-uso/enlaces/quitar-enlace.js';
import type { EnlaceSolicitado, ParamsEnlace, ParamsRol } from './enlaces.esquemas-http.js';

export interface CasosDeUsoDeEnlaces {
  listar: ListarEnlaces;
  llaves: ListarLlavesDeEnlace;
  guardar: GuardarEnlace;
  quitar: QuitarEnlace;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class EnlacesControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeEnlaces) {}

  listar = (solicitud: FastifyRequest) => this.casosDeUso.listar.ejecutar(operadorDe(solicitud));

  llaves = (solicitud: FastifyRequest<{ Params: ParamsRol }>) =>
    this.casosDeUso.llaves.ejecutar(operadorDe(solicitud), solicitud.params.rol);

  guardar = (solicitud: FastifyRequest<{ Params: ParamsRol; Body: EnlaceSolicitado }>) =>
    this.casosDeUso.guardar.ejecutar(operadorDe(solicitud), {
      rol: solicitud.params.rol,
      solicitud: solicitud.body,
    });

  quitar = async (solicitud: FastifyRequest<{ Params: ParamsEnlace }>, respuesta: FastifyReply) => {
    await this.casosDeUso.quitar.ejecutar(operadorDe(solicitud), solicitud.params.enlaceId);
    return respuesta.status(204).send();
  };
}
