import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ActualizarConceptoDeGasto } from '../aplicacion/casos-uso/conceptos-de-gasto/actualizar-concepto-de-gasto.js';
import type { CrearConceptoDeGasto } from '../aplicacion/casos-uso/conceptos-de-gasto/crear-concepto-de-gasto.js';
import type { ListarConceptosDeGasto } from '../aplicacion/casos-uso/conceptos-de-gasto/listar-conceptos-de-gasto.js';
import type { ObtenerConceptoDeGasto } from '../aplicacion/casos-uso/conceptos-de-gasto/obtener-concepto-de-gasto.js';
import type { ConceptoDeGastoSolicitado, ParamsConceptoDeGasto } from './conceptos-de-gasto.esquemas-http.js';

export interface CasosDeUsoDeConceptosDeGasto {
  listar: ListarConceptosDeGasto;
  obtener: ObtenerConceptoDeGasto;
  crear: CrearConceptoDeGasto;
  actualizar: ActualizarConceptoDeGasto;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class ConceptosDeGastoControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeConceptosDeGasto) {}

  listar = (solicitud: FastifyRequest) => this.casosDeUso.listar.ejecutar(operadorDe(solicitud));

  obtener = (solicitud: FastifyRequest<{ Params: ParamsConceptoDeGasto }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.conceptoDeGastoId);

  crear = async (solicitud: FastifyRequest<{ Body: ConceptoDeGastoSolicitado }>, respuesta: FastifyReply) => {
    const conceptoDeGasto = await this.casosDeUso.crear.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(conceptoDeGasto);
  };

  actualizar = (solicitud: FastifyRequest<{ Params: ParamsConceptoDeGasto; Body: ConceptoDeGastoSolicitado }>) =>
    this.casosDeUso.actualizar.ejecutar(operadorDe(solicitud), {
      conceptoDeGastoId: solicitud.params.conceptoDeGastoId,
      solicitud: solicitud.body,
    });
}
