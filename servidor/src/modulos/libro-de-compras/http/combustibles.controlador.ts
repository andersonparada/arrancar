import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ActualizarCombustible } from '../aplicacion/casos-uso/combustibles/actualizar-combustible.js';
import type { CrearCombustible } from '../aplicacion/casos-uso/combustibles/crear-combustible.js';
import type { ListarCombustibles } from '../aplicacion/casos-uso/combustibles/listar-combustibles.js';
import type { ObtenerCombustible } from '../aplicacion/casos-uso/combustibles/obtener-combustible.js';
import type { CombustibleSolicitado, ParamsCombustible } from './combustibles.esquemas-http.js';

export interface CasosDeUsoDeCombustibles {
  listar: ListarCombustibles;
  obtener: ObtenerCombustible;
  crear: CrearCombustible;
  actualizar: ActualizarCombustible;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class CombustiblesControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeCombustibles) {}

  listar = (solicitud: FastifyRequest) => this.casosDeUso.listar.ejecutar(operadorDe(solicitud));

  obtener = (solicitud: FastifyRequest<{ Params: ParamsCombustible }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.combustibleId);

  crear = async (solicitud: FastifyRequest<{ Body: CombustibleSolicitado }>, respuesta: FastifyReply) => {
    const combustible = await this.casosDeUso.crear.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(combustible);
  };

  actualizar = (solicitud: FastifyRequest<{ Params: ParamsCombustible; Body: CombustibleSolicitado }>) =>
    this.casosDeUso.actualizar.ejecutar(operadorDe(solicitud), {
      combustibleId: solicitud.params.combustibleId,
      solicitud: solicitud.body,
    });
}
