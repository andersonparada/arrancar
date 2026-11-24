import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { AnularDivision } from '../aplicacion/casos-uso/divisiones/anular-division.js';
import type { DividirActivo } from '../aplicacion/casos-uso/divisiones/dividir-activo.js';
import type { SepararEnUnidades } from '../aplicacion/casos-uso/divisiones/separar-en-unidades.js';
import type { ParamsActivo } from './activos.esquemas-http.js';
import type {
  AnulacionDeDivisionSolicitada,
  DivisionSolicitada,
  ParamsDivision,
  SeparacionSolicitada,
} from './divisiones.esquemas-http.js';

export interface CasosDeUsoDeDivisiones {
  dividir: DividirActivo;
  separar: SepararEnUnidades;
  anular: AnularDivision;
}

/** Traduce las peticiones HTTP de las divisiones a casos de uso; no contiene reglas de negocio. */
export class DivisionesControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeDivisiones) {}

  dividir = async (
    solicitud: FastifyRequest<{ Params: ParamsActivo; Body: DivisionSolicitada }>,
    respuesta: FastifyReply,
  ) => {
    const division = await this.casosDeUso.dividir.ejecutar(operadorDe(solicitud), {
      activoId: solicitud.params.activoId,
      solicitud: solicitud.body,
    });
    return respuesta.status(201).send(division);
  };

  separar = async (
    solicitud: FastifyRequest<{ Params: ParamsActivo; Body: SeparacionSolicitada }>,
    respuesta: FastifyReply,
  ) => {
    const divisiones = await this.casosDeUso.separar.ejecutar(operadorDe(solicitud), {
      activoId: solicitud.params.activoId,
      solicitud: solicitud.body,
    });
    return respuesta.status(201).send(divisiones);
  };

  anular = (solicitud: FastifyRequest<{ Params: ParamsDivision; Body: AnulacionDeDivisionSolicitada }>) =>
    this.casosDeUso.anular.ejecutar(operadorDe(solicitud), {
      divisionId: solicitud.params.divisionId,
      motivo: solicitud.body.motivo,
    });
}
