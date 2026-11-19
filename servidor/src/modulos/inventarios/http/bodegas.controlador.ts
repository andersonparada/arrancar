import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ActualizarBodega } from '../aplicacion/casos-uso/bodegas/actualizar-bodega.js';
import type { CrearBodega } from '../aplicacion/casos-uso/bodegas/crear-bodega.js';
import type { EliminarBodega } from '../aplicacion/casos-uso/bodegas/eliminar-bodega.js';
import type { ListarBodegas } from '../aplicacion/casos-uso/bodegas/listar-bodegas.js';
import type { ObtenerBodega } from '../aplicacion/casos-uso/bodegas/obtener-bodega.js';
import type { BodegaSolicitado, ParamsBodega } from './bodegas.esquemas-http.js';

export interface CasosDeUsoDeBodegas {
  listar: ListarBodegas;
  obtener: ObtenerBodega;
  crear: CrearBodega;
  actualizar: ActualizarBodega;
  eliminar: EliminarBodega;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class BodegasControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeBodegas) {}

  listar = (solicitud: FastifyRequest) => this.casosDeUso.listar.ejecutar(operadorDe(solicitud));

  obtener = (solicitud: FastifyRequest<{ Params: ParamsBodega }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.bodegaId);

  crear = async (solicitud: FastifyRequest<{ Body: BodegaSolicitado }>, respuesta: FastifyReply) => {
    const bodega = await this.casosDeUso.crear.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(bodega);
  };

  actualizar = (solicitud: FastifyRequest<{ Params: ParamsBodega; Body: BodegaSolicitado }>) =>
    this.casosDeUso.actualizar.ejecutar(operadorDe(solicitud), {
      bodegaId: solicitud.params.bodegaId,
      solicitud: solicitud.body,
    });
  eliminar = async (solicitud: FastifyRequest<{ Params: ParamsBodega }>, respuesta: FastifyReply) => {
    await this.casosDeUso.eliminar.ejecutar(operadorDe(solicitud), solicitud.params.bodegaId);
    return respuesta.status(204).send();
  };
}
