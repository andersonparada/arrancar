import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ActualizarTipoDeLocalidad } from '../aplicacion/casos-uso/tipos-de-localidad/actualizar-tipo-de-localidad.js';
import type { CrearTipoDeLocalidad } from '../aplicacion/casos-uso/tipos-de-localidad/crear-tipo-de-localidad.js';
import type { EliminarTipoDeLocalidad } from '../aplicacion/casos-uso/tipos-de-localidad/eliminar-tipo-de-localidad.js';
import type { ListarTiposDeLocalidad } from '../aplicacion/casos-uso/tipos-de-localidad/listar-tipos-de-localidad.js';
import type { ObtenerTipoDeLocalidad } from '../aplicacion/casos-uso/tipos-de-localidad/obtener-tipo-de-localidad.js';
import type { TipoDeLocalidadSolicitado, ParamsTipoDeLocalidad } from './tipos-de-localidad.esquemas-http.js';

export interface CasosDeUsoDeTiposDeLocalidad {
  listar: ListarTiposDeLocalidad;
  obtener: ObtenerTipoDeLocalidad;
  crear: CrearTipoDeLocalidad;
  actualizar: ActualizarTipoDeLocalidad;
  eliminar: EliminarTipoDeLocalidad;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class TiposDeLocalidadControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeTiposDeLocalidad) {}

  listar = (solicitud: FastifyRequest) => this.casosDeUso.listar.ejecutar(operadorDe(solicitud));

  obtener = (solicitud: FastifyRequest<{ Params: ParamsTipoDeLocalidad }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.tipoDeLocalidadId);

  crear = async (solicitud: FastifyRequest<{ Body: TipoDeLocalidadSolicitado }>, respuesta: FastifyReply) => {
    const tipoDeLocalidad = await this.casosDeUso.crear.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(tipoDeLocalidad);
  };

  actualizar = (solicitud: FastifyRequest<{ Params: ParamsTipoDeLocalidad; Body: TipoDeLocalidadSolicitado }>) =>
    this.casosDeUso.actualizar.ejecutar(operadorDe(solicitud), {
      tipoDeLocalidadId: solicitud.params.tipoDeLocalidadId,
      solicitud: solicitud.body,
    });

  eliminar = async (solicitud: FastifyRequest<{ Params: ParamsTipoDeLocalidad }>, respuesta: FastifyReply) => {
    await this.casosDeUso.eliminar.ejecutar(operadorDe(solicitud), solicitud.params.tipoDeLocalidadId);
    return respuesta.status(204).send();
  };
}
