import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ActualizarUnidad } from '../aplicacion/casos-uso/unidades/actualizar-unidad.js';
import type { CrearUnidad } from '../aplicacion/casos-uso/unidades/crear-unidad.js';
import type { EliminarUnidad } from '../aplicacion/casos-uso/unidades/eliminar-unidad.js';
import type { ListarUnidades } from '../aplicacion/casos-uso/unidades/listar-unidades.js';
import type { ObtenerUnidad } from '../aplicacion/casos-uso/unidades/obtener-unidad.js';
import type { UnidadSolicitado, ParamsUnidad } from './unidades.esquemas-http.js';

export interface CasosDeUsoDeUnidades {
  listar: ListarUnidades;
  obtener: ObtenerUnidad;
  crear: CrearUnidad;
  actualizar: ActualizarUnidad;
  eliminar: EliminarUnidad;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class UnidadesControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeUnidades) {}

  listar = (solicitud: FastifyRequest) => this.casosDeUso.listar.ejecutar(operadorDe(solicitud));

  obtener = (solicitud: FastifyRequest<{ Params: ParamsUnidad }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.unidadId);

  crear = async (solicitud: FastifyRequest<{ Body: UnidadSolicitado }>, respuesta: FastifyReply) => {
    const unidad = await this.casosDeUso.crear.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(unidad);
  };

  actualizar = (solicitud: FastifyRequest<{ Params: ParamsUnidad; Body: UnidadSolicitado }>) =>
    this.casosDeUso.actualizar.ejecutar(operadorDe(solicitud), {
      unidadId: solicitud.params.unidadId,
      solicitud: solicitud.body,
    });

  eliminar = async (solicitud: FastifyRequest<{ Params: ParamsUnidad }>, respuesta: FastifyReply) => {
    await this.casosDeUso.eliminar.ejecutar(operadorDe(solicitud), solicitud.params.unidadId);
    return respuesta.status(204).send();
  };
}
