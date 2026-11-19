import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ActualizarInmueble } from '../aplicacion/casos-uso/inmuebles/actualizar-inmueble.js';
import type { EliminarInmueble } from '../aplicacion/casos-uso/inmuebles/eliminar-inmueble.js';
import type { InactivarInmueble } from '../aplicacion/casos-uso/inmuebles/inactivar-inmueble.js';
import type { ReactivarInmueble } from '../aplicacion/casos-uso/inmuebles/reactivar-inmueble.js';
import type { CrearInmueble } from '../aplicacion/casos-uso/inmuebles/crear-inmueble.js';
import type { ListarInmuebles } from '../aplicacion/casos-uso/inmuebles/listar-inmuebles.js';
import type { ObtenerInmueble } from '../aplicacion/casos-uso/inmuebles/obtener-inmueble.js';
import type { InmuebleSolicitado, ParamsInmueble } from './inmuebles.esquemas-http.js';

export interface CasosDeUsoDeInmuebles {
  listar: ListarInmuebles;
  obtener: ObtenerInmueble;
  crear: CrearInmueble;
  actualizar: ActualizarInmueble;
  inactivar: InactivarInmueble;
  reactivar: ReactivarInmueble;
  eliminar: EliminarInmueble;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class InmueblesControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeInmuebles) {}

  listar = (solicitud: FastifyRequest) => this.casosDeUso.listar.ejecutar(operadorDe(solicitud));

  obtener = (solicitud: FastifyRequest<{ Params: ParamsInmueble }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.inmuebleId);

  crear = async (solicitud: FastifyRequest<{ Body: InmuebleSolicitado }>, respuesta: FastifyReply) => {
    const inmueble = await this.casosDeUso.crear.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(inmueble);
  };

  actualizar = (solicitud: FastifyRequest<{ Params: ParamsInmueble; Body: InmuebleSolicitado }>) =>
    this.casosDeUso.actualizar.ejecutar(operadorDe(solicitud), {
      inmuebleId: solicitud.params.inmuebleId,
      solicitud: solicitud.body,
    });

  inactivar = (solicitud: FastifyRequest<{ Params: ParamsInmueble }>) =>
    this.casosDeUso.inactivar.ejecutar(operadorDe(solicitud), solicitud.params.inmuebleId);

  reactivar = (solicitud: FastifyRequest<{ Params: ParamsInmueble }>) =>
    this.casosDeUso.reactivar.ejecutar(operadorDe(solicitud), solicitud.params.inmuebleId);

  eliminar = async (solicitud: FastifyRequest<{ Params: ParamsInmueble }>, respuesta: FastifyReply) => {
    await this.casosDeUso.eliminar.ejecutar(operadorDe(solicitud), solicitud.params.inmuebleId);
    return respuesta.status(204).send();
  };
}
