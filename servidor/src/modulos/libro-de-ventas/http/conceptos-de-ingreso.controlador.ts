import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ActualizarConceptoDeIngreso } from '../aplicacion/casos-uso/conceptos-de-ingreso/actualizar-concepto-de-ingreso.js';
import type { CrearConceptoDeIngreso } from '../aplicacion/casos-uso/conceptos-de-ingreso/crear-concepto-de-ingreso.js';
import type { EliminarConceptoDeIngreso } from '../aplicacion/casos-uso/conceptos-de-ingreso/eliminar-concepto-de-ingreso.js';
import type { ListarConceptosDeIngreso } from '../aplicacion/casos-uso/conceptos-de-ingreso/listar-conceptos-de-ingreso.js';
import type { ObtenerConceptoDeIngreso } from '../aplicacion/casos-uso/conceptos-de-ingreso/obtener-concepto-de-ingreso.js';
import type { ConceptoDeIngresoSolicitado, ParamsConceptoDeIngreso } from './conceptos-de-ingreso.esquemas-http.js';

export interface CasosDeUsoDeConceptosDeIngreso {
  listar: ListarConceptosDeIngreso;
  obtener: ObtenerConceptoDeIngreso;
  crear: CrearConceptoDeIngreso;
  actualizar: ActualizarConceptoDeIngreso;
  eliminar: EliminarConceptoDeIngreso;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class ConceptosDeIngresoControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeConceptosDeIngreso) {}

  listar = (solicitud: FastifyRequest) => this.casosDeUso.listar.ejecutar(operadorDe(solicitud));

  obtener = (solicitud: FastifyRequest<{ Params: ParamsConceptoDeIngreso }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.conceptoDeIngresoId);

  crear = async (solicitud: FastifyRequest<{ Body: ConceptoDeIngresoSolicitado }>, respuesta: FastifyReply) => {
    const conceptoDeIngreso = await this.casosDeUso.crear.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(conceptoDeIngreso);
  };

  actualizar = (solicitud: FastifyRequest<{ Params: ParamsConceptoDeIngreso; Body: ConceptoDeIngresoSolicitado }>) =>
    this.casosDeUso.actualizar.ejecutar(operadorDe(solicitud), {
      conceptoDeIngresoId: solicitud.params.conceptoDeIngresoId,
      solicitud: solicitud.body,
    });

  eliminar = async (solicitud: FastifyRequest<{ Params: ParamsConceptoDeIngreso }>, respuesta: FastifyReply) => {
    await this.casosDeUso.eliminar.ejecutar(operadorDe(solicitud), solicitud.params.conceptoDeIngresoId);
    return respuesta.status(204).send();
  };
}
