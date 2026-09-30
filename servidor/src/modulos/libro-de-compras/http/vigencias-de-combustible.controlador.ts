import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ActualizarVigenciaDeCombustible } from '../aplicacion/casos-uso/vigencias-de-combustible/actualizar-vigencia-de-combustible.js';
import type { CrearVigenciaDeCombustible } from '../aplicacion/casos-uso/vigencias-de-combustible/crear-vigencia-de-combustible.js';
import type { EliminarVigenciaDeCombustible } from '../aplicacion/casos-uso/vigencias-de-combustible/eliminar-vigencia-de-combustible.js';
import type { ListarVigenciasDeCombustible } from '../aplicacion/casos-uso/vigencias-de-combustible/listar-vigencias-de-combustible.js';
import type { ObtenerVigenciaDeCombustible } from '../aplicacion/casos-uso/vigencias-de-combustible/obtener-vigencia-de-combustible.js';
import type {
  VigenciaDeCombustibleSolicitado,
  ParamsVigenciaDeCombustible,
} from './vigencias-de-combustible.esquemas-http.js';

export interface CasosDeUsoDeVigenciasDeCombustible {
  listar: ListarVigenciasDeCombustible;
  obtener: ObtenerVigenciaDeCombustible;
  crear: CrearVigenciaDeCombustible;
  actualizar: ActualizarVigenciaDeCombustible;
  eliminar: EliminarVigenciaDeCombustible;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class VigenciasDeCombustibleControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeVigenciasDeCombustible) {}

  listar = (solicitud: FastifyRequest) => this.casosDeUso.listar.ejecutar(operadorDe(solicitud));

  obtener = (solicitud: FastifyRequest<{ Params: ParamsVigenciaDeCombustible }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.vigenciaDeCombustibleId);

  crear = async (solicitud: FastifyRequest<{ Body: VigenciaDeCombustibleSolicitado }>, respuesta: FastifyReply) => {
    const vigenciaDeCombustible = await this.casosDeUso.crear.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(vigenciaDeCombustible);
  };

  actualizar = (
    solicitud: FastifyRequest<{ Params: ParamsVigenciaDeCombustible; Body: VigenciaDeCombustibleSolicitado }>,
  ) =>
    this.casosDeUso.actualizar.ejecutar(operadorDe(solicitud), {
      vigenciaDeCombustibleId: solicitud.params.vigenciaDeCombustibleId,
      solicitud: solicitud.body,
    });

  eliminar = async (solicitud: FastifyRequest<{ Params: ParamsVigenciaDeCombustible }>, respuesta: FastifyReply) => {
    await this.casosDeUso.eliminar.ejecutar(operadorDe(solicitud), solicitud.params.vigenciaDeCombustibleId);
    return respuesta.status(204).send();
  };
}
