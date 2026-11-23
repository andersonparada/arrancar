import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { EliminarValorDeInmueble } from '../aplicacion/casos-uso/inmuebles/valores/eliminar-valor-de-inmueble.js';
import type { ListarValoresDeInmueble } from '../aplicacion/casos-uso/inmuebles/valores/listar-valores-de-inmueble.js';
import type { RegistrarValorDeInmueble } from '../aplicacion/casos-uso/inmuebles/valores/registrar-valor-de-inmueble.js';
import type {
  ParamsDeValoresDeInmueble,
  ParamsValorDeInmueble,
  ValorDeInmuebleSolicitado,
} from './valores-de-inmueble.esquemas-http.js';

export interface CasosDeUsoDeValoresDeInmueble {
  listar: ListarValoresDeInmueble;
  registrar: RegistrarValorDeInmueble;
  eliminar: EliminarValorDeInmueble;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class ValoresDeInmuebleControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeValoresDeInmueble) {}

  listar = (solicitud: FastifyRequest<{ Params: ParamsDeValoresDeInmueble }>) =>
    this.casosDeUso.listar.ejecutar(operadorDe(solicitud), solicitud.params.inmuebleId);

  registrar = async (
    solicitud: FastifyRequest<{ Params: ParamsDeValoresDeInmueble; Body: ValorDeInmuebleSolicitado }>,
    respuesta: FastifyReply,
  ) => {
    const valor = await this.casosDeUso.registrar.ejecutar(operadorDe(solicitud), {
      inmuebleId: solicitud.params.inmuebleId,
      solicitud: solicitud.body,
    });
    return respuesta.status(201).send(valor);
  };

  eliminar = async (solicitud: FastifyRequest<{ Params: ParamsValorDeInmueble }>, respuesta: FastifyReply) => {
    await this.casosDeUso.eliminar.ejecutar(operadorDe(solicitud), solicitud.params);
    return respuesta.status(204).send();
  };
}
