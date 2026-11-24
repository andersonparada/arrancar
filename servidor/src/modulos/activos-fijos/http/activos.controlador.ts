import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { CrearActivo } from '../aplicacion/casos-uso/activos/crear-activo.js';
import type { EditarActivo } from '../aplicacion/casos-uso/activos/editar-activo.js';
import type { EliminarActivo } from '../aplicacion/casos-uso/activos/eliminar-activo.js';
import type { PonerEnUso } from '../aplicacion/casos-uso/activos/poner-en-uso.js';
import type { PonerEnUsoVarios } from '../aplicacion/casos-uso/activos/poner-en-uso-varios.js';
import type { QuitarDeUso } from '../aplicacion/casos-uso/activos/quitar-de-uso.js';
import type { MarcarOcioso } from '../aplicacion/casos-uso/activos/marcar-ocioso.js';
import type {
  ListarActivos,
  ListarUbicaciones,
  ObtenerActivo,
} from '../aplicacion/casos-uso/activos/consultas-de-activos.js';
import type {
  ActivoSolicitado,
  EdicionDeActivoSolicitada,
  FiltrosDeActivosSolicitados,
  OcioDeActivoSolicitado,
  ParamsActivo,
  PonerEnUsoSolicitado,
  PonerEnUsoVariosSolicitado,
} from './activos.esquemas-http.js';

export interface CasosDeUsoDeActivos {
  listar: ListarActivos;
  obtener: ObtenerActivo;
  crear: CrearActivo;
  editar: EditarActivo;
  marcarOcioso: MarcarOcioso;
  ponerEnUso: PonerEnUso;
  ponerEnUsoVarios: PonerEnUsoVarios;
  quitarDeUso: QuitarDeUso;
  eliminar: EliminarActivo;
  ubicaciones: ListarUbicaciones;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class ActivosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeActivos) {}

  listar = (solicitud: FastifyRequest<{ Querystring: FiltrosDeActivosSolicitados }>) =>
    this.casosDeUso.listar.ejecutar(operadorDe(solicitud), solicitud.query);

  obtener = (solicitud: FastifyRequest<{ Params: ParamsActivo }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.activoId);

  ubicaciones = (solicitud: FastifyRequest) => this.casosDeUso.ubicaciones.ejecutar(operadorDe(solicitud));

  crear = async (solicitud: FastifyRequest<{ Body: ActivoSolicitado }>, respuesta: FastifyReply) => {
    const activo = await this.casosDeUso.crear.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(activo);
  };

  editar = (solicitud: FastifyRequest<{ Params: ParamsActivo; Body: EdicionDeActivoSolicitada }>) =>
    this.casosDeUso.editar.ejecutar(operadorDe(solicitud), {
      activoId: solicitud.params.activoId,
      solicitud: solicitud.body,
    });

  marcarOcioso = (solicitud: FastifyRequest<{ Params: ParamsActivo; Body: OcioDeActivoSolicitado }>) =>
    this.casosDeUso.marcarOcioso.ejecutar(operadorDe(solicitud), {
      activoId: solicitud.params.activoId,
      solicitud: solicitud.body,
    });

  ponerEnUso = (solicitud: FastifyRequest<{ Params: ParamsActivo; Body: PonerEnUsoSolicitado }>) =>
    this.casosDeUso.ponerEnUso.ejecutar(operadorDe(solicitud), {
      activoId: solicitud.params.activoId,
      solicitud: solicitud.body,
    });

  ponerEnUsoVarios = (solicitud: FastifyRequest<{ Body: PonerEnUsoVariosSolicitado }>) =>
    this.casosDeUso.ponerEnUsoVarios.ejecutar(operadorDe(solicitud), solicitud.body);

  quitarDeUso = (solicitud: FastifyRequest<{ Params: ParamsActivo }>) =>
    this.casosDeUso.quitarDeUso.ejecutar(operadorDe(solicitud), solicitud.params.activoId);

  eliminar = async (solicitud: FastifyRequest<{ Params: ParamsActivo }>, respuesta: FastifyReply) => {
    await this.casosDeUso.eliminar.ejecutar(operadorDe(solicitud), solicitud.params.activoId);
    return respuesta.status(204).send();
  };
}
