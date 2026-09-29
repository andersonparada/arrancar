import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ActualizarConcepto } from '../aplicacion/casos-uso/conceptos/actualizar-concepto.js';
import type { EliminarConcepto } from '../aplicacion/casos-uso/conceptos/eliminar-concepto.js';
import type { CrearConcepto } from '../aplicacion/casos-uso/conceptos/crear-concepto.js';
import type { ListarConceptos } from '../aplicacion/casos-uso/conceptos/listar-conceptos.js';
import type { ObtenerConcepto } from '../aplicacion/casos-uso/conceptos/obtener-concepto.js';
import type { ConceptoSolicitado, EliminacionDeConcepto, ParamsConcepto } from './conceptos.esquemas-http.js';

export interface CasosDeUsoDeConceptos {
  listar: ListarConceptos;
  obtener: ObtenerConcepto;
  crear: CrearConcepto;
  actualizar: ActualizarConcepto;
  eliminar: EliminarConcepto;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class ConceptosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeConceptos) {}

  listar = (solicitud: FastifyRequest) => this.casosDeUso.listar.ejecutar(operadorDe(solicitud));

  obtener = (solicitud: FastifyRequest<{ Params: ParamsConcepto }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.conceptoId);

  crear = async (solicitud: FastifyRequest<{ Body: ConceptoSolicitado }>, respuesta: FastifyReply) => {
    const concepto = await this.casosDeUso.crear.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(concepto);
  };

  actualizar = (solicitud: FastifyRequest<{ Params: ParamsConcepto; Body: ConceptoSolicitado }>) =>
    this.casosDeUso.actualizar.ejecutar(operadorDe(solicitud), {
      conceptoId: solicitud.params.conceptoId,
      solicitud: solicitud.body,
    });

  eliminar = async (
    solicitud: FastifyRequest<{ Params: ParamsConcepto; Body: EliminacionDeConcepto }>,
    respuesta: FastifyReply,
  ) => {
    await this.casosDeUso.eliminar.ejecutar(operadorDe(solicitud), {
      conceptoId: solicitud.params.conceptoId,
      motivo: solicitud.body.motivo,
    });
    return respuesta.status(204).send();
  };
}
