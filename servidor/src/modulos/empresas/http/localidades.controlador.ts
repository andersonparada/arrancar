import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ActualizarLocalidad } from '../aplicacion/casos-uso/localidades/actualizar-localidad.js';
import type { CrearLocalidad } from '../aplicacion/casos-uso/localidades/crear-localidad.js';
import type { EliminarLocalidad } from '../aplicacion/casos-uso/localidades/eliminar-localidad.js';
import type { ListarLocalidades } from '../aplicacion/casos-uso/localidades/listar-localidades.js';
import type { ObtenerLocalidad } from '../aplicacion/casos-uso/localidades/obtener-localidad.js';
import type { LocalidadSolicitado, ParamsLocalidad } from './localidades.esquemas-http.js';

export interface CasosDeUsoDeLocalidades {
  listar: ListarLocalidades;
  obtener: ObtenerLocalidad;
  crear: CrearLocalidad;
  actualizar: ActualizarLocalidad;
  eliminar: EliminarLocalidad;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class LocalidadesControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeLocalidades) {}

  listar = (solicitud: FastifyRequest) => this.casosDeUso.listar.ejecutar(operadorDe(solicitud));

  obtener = (solicitud: FastifyRequest<{ Params: ParamsLocalidad }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.localidadId);

  crear = async (solicitud: FastifyRequest<{ Body: LocalidadSolicitado }>, respuesta: FastifyReply) => {
    const localidad = await this.casosDeUso.crear.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(localidad);
  };

  actualizar = (solicitud: FastifyRequest<{ Params: ParamsLocalidad; Body: LocalidadSolicitado }>) =>
    this.casosDeUso.actualizar.ejecutar(operadorDe(solicitud), {
      localidadId: solicitud.params.localidadId,
      solicitud: solicitud.body,
    });

  eliminar = async (solicitud: FastifyRequest<{ Params: ParamsLocalidad }>, respuesta: FastifyReply) => {
    await this.casosDeUso.eliminar.ejecutar(operadorDe(solicitud), solicitud.params.localidadId);
    return respuesta.status(204).send();
  };
}
