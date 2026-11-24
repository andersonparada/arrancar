import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { AnularMedicion } from '../aplicacion/casos-uso/mediciones/anular-medicion.js';
import type { RegistrarMedicion } from '../aplicacion/casos-uso/mediciones/registrar-medicion.js';
import type {
  AnulacionDeMedicionSolicitada,
  MedicionSolicitada,
  ParamsDeParcelaMedicion,
  ParamsMedicion,
} from './mediciones.esquemas-http.js';

export interface CasosDeUsoDeMediciones {
  registrar: RegistrarMedicion;
  anular: AnularMedicion;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class MedicionesControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeMediciones) {}

  registrar = async (
    solicitud: FastifyRequest<{ Params: ParamsDeParcelaMedicion; Body: MedicionSolicitada }>,
    respuesta: FastifyReply,
  ) => {
    const ficha = await this.casosDeUso.registrar.ejecutar(operadorDe(solicitud), {
      parcelaId: solicitud.params.parcelaId,
      solicitud: solicitud.body,
    });
    return respuesta.status(201).send(ficha);
  };

  anular = (solicitud: FastifyRequest<{ Params: ParamsMedicion; Body: AnulacionDeMedicionSolicitada }>) =>
    this.casosDeUso.anular.ejecutar(operadorDe(solicitud), {
      medicionId: solicitud.params.medicionId,
      solicitud: solicitud.body,
    });
}
