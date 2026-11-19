import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ActualizarClase } from '../aplicacion/casos-uso/clases/actualizar-clase.js';
import type { CrearClase } from '../aplicacion/casos-uso/clases/crear-clase.js';
import type { EliminarClase } from '../aplicacion/casos-uso/clases/eliminar-clase.js';
import type { ListarConceptosDeClase } from '../aplicacion/casos-uso/clases/listar-conceptos-de-clase.js';
import type { ListarClases } from '../aplicacion/casos-uso/clases/listar-clases.js';
import type { ObtenerClase } from '../aplicacion/casos-uso/clases/obtener-clase.js';
import type { ReemplazarConceptosDeClase } from '../aplicacion/casos-uso/clases/reemplazar-conceptos-de-clase.js';
import type { ClaseSolicitado, ConceptosDeClaseSolicitados, ParamsClase } from './clases.esquemas-http.js';

export interface CasosDeUsoDeClases {
  listar: ListarClases;
  obtener: ObtenerClase;
  crear: CrearClase;
  actualizar: ActualizarClase;
  eliminar: EliminarClase;
  listarConceptos: ListarConceptosDeClase;
  reemplazarConceptos: ReemplazarConceptosDeClase;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class ClasesControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeClases) {}

  listar = (solicitud: FastifyRequest) => this.casosDeUso.listar.ejecutar(operadorDe(solicitud));

  obtener = (solicitud: FastifyRequest<{ Params: ParamsClase }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.claseId);

  crear = async (solicitud: FastifyRequest<{ Body: ClaseSolicitado }>, respuesta: FastifyReply) => {
    const clase = await this.casosDeUso.crear.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(clase);
  };

  actualizar = (solicitud: FastifyRequest<{ Params: ParamsClase; Body: ClaseSolicitado }>) =>
    this.casosDeUso.actualizar.ejecutar(operadorDe(solicitud), {
      claseId: solicitud.params.claseId,
      solicitud: solicitud.body,
    });

  eliminar = async (solicitud: FastifyRequest<{ Params: ParamsClase }>, respuesta: FastifyReply) => {
    await this.casosDeUso.eliminar.ejecutar(operadorDe(solicitud), solicitud.params.claseId);
    return respuesta.status(204).send();
  };

  listarConceptos = (solicitud: FastifyRequest<{ Params: ParamsClase }>) =>
    this.casosDeUso.listarConceptos.ejecutar(operadorDe(solicitud), solicitud.params.claseId);

  reemplazarConceptos = (solicitud: FastifyRequest<{ Params: ParamsClase; Body: ConceptosDeClaseSolicitados }>) =>
    this.casosDeUso.reemplazarConceptos.ejecutar(operadorDe(solicitud), {
      claseId: solicitud.params.claseId,
      conceptoIds: solicitud.body.conceptoIds,
    });
}
