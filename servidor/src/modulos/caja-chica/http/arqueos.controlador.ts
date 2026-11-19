import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { AnularArqueo } from '../aplicacion/casos-uso/arqueos/anular-arqueo.js';
import type {
  ListarArqueos,
  ObtenerArqueo,
  ProponerArqueo,
} from '../aplicacion/casos-uso/arqueos/consultas-de-arqueos.js';
import type { RegistrarArqueo } from '../aplicacion/casos-uso/arqueos/registrar-arqueo.js';
import type { AnularArqueoSolicitado, ArqueoSolicitado, ParamsDeArqueo } from './arqueos.esquemas-http.js';
import type { ParamsDeFondo } from './fondos.esquemas-http.js';

export interface CasosDeUsoDeArqueos {
  listar: ListarArqueos;
  obtener: ObtenerArqueo;
  propuesta: ProponerArqueo;
  registrar: RegistrarArqueo;
  anular: AnularArqueo;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class ArqueosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeArqueos) {}

  listar = (solicitud: FastifyRequest<{ Params: ParamsDeFondo }>) =>
    this.casosDeUso.listar.ejecutar(operadorDe(solicitud), solicitud.params.id);

  propuesta = (solicitud: FastifyRequest<{ Params: ParamsDeFondo }>) =>
    this.casosDeUso.propuesta.ejecutar(operadorDe(solicitud), solicitud.params.id);

  obtener = (solicitud: FastifyRequest<{ Params: ParamsDeArqueo }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.id);

  registrar = async (
    solicitud: FastifyRequest<{ Params: ParamsDeFondo; Body: ArqueoSolicitado }>,
    respuesta: FastifyReply,
  ) => {
    const { valoresPorCambiar, ...cuerpo } = solicitud.body;
    const arqueo = await this.casosDeUso.registrar.ejecutar(operadorDe(solicitud), {
      ...cuerpo,
      ...(valoresPorCambiar === undefined ? {} : { valoresPorCambiarCentavos: valoresPorCambiar }),
      fondoId: solicitud.params.id,
    });
    return respuesta.status(201).send(arqueo);
  };

  anular = (solicitud: FastifyRequest<{ Params: ParamsDeArqueo; Body: AnularArqueoSolicitado }>) =>
    this.casosDeUso.anular.ejecutar(operadorDe(solicitud), { arqueoId: solicitud.params.id, ...solicitud.body });
}
