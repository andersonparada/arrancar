import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { AutorizarConciliacion } from '../aplicacion/casos-uso/conciliaciones/autorizar-conciliacion.js';
import type { DevolverConciliacion } from '../aplicacion/casos-uso/conciliaciones/devolver-conciliacion.js';
import type { EliminarConciliacion } from '../aplicacion/casos-uso/conciliaciones/eliminar-conciliacion.js';
import type { IniciarConciliacion } from '../aplicacion/casos-uso/conciliaciones/iniciar-conciliacion.js';
import type { ListarConciliaciones } from '../aplicacion/casos-uso/conciliaciones/listar-conciliaciones.js';
import type { MarcarMovimientos } from '../aplicacion/casos-uso/conciliaciones/marcar-movimientos.js';
import type { ObtenerConciliacion } from '../aplicacion/casos-uso/conciliaciones/obtener-conciliacion.js';
import type { TerminarConciliacion } from '../aplicacion/casos-uso/conciliaciones/terminar-conciliacion.js';
import type {
  InicioDeConciliacionSolicitado,
  MarcasSolicitadas,
  ParamsConciliacion,
  ParamsCuentaBancariaDeConciliaciones,
  SolicitudConMotivo,
} from './conciliaciones.esquemas-http.js';

export interface CasosDeUsoDeConciliaciones {
  listar: ListarConciliaciones;
  obtener: ObtenerConciliacion;
  iniciar: IniciarConciliacion;
  marcar: MarcarMovimientos;
  terminar: TerminarConciliacion;
  autorizar: AutorizarConciliacion;
  devolver: DevolverConciliacion;
  eliminar: EliminarConciliacion;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class ConciliacionesControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeConciliaciones) {}

  listarDeLaCuenta = (solicitud: FastifyRequest<{ Params: ParamsCuentaBancariaDeConciliaciones }>) =>
    this.casosDeUso.listar.ejecutar(operadorDe(solicitud), solicitud.params.cuentaBancariaId);

  obtener = (solicitud: FastifyRequest<{ Params: ParamsConciliacion }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.conciliacionId);

  iniciar = async (solicitud: FastifyRequest<{ Body: InicioDeConciliacionSolicitado }>, respuesta: FastifyReply) => {
    const conciliacion = await this.casosDeUso.iniciar.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(conciliacion);
  };

  guardarMarcas = (solicitud: FastifyRequest<{ Params: ParamsConciliacion; Body: MarcasSolicitadas }>) =>
    this.casosDeUso.marcar.ejecutar(operadorDe(solicitud), {
      conciliacionId: solicitud.params.conciliacionId,
      movimientoIds: solicitud.body.movimientoIds,
    });

  terminar = (solicitud: FastifyRequest<{ Params: ParamsConciliacion }>) =>
    this.casosDeUso.terminar.ejecutar(operadorDe(solicitud), solicitud.params.conciliacionId);

  autorizar = (solicitud: FastifyRequest<{ Params: ParamsConciliacion }>) =>
    this.casosDeUso.autorizar.ejecutar(operadorDe(solicitud), solicitud.params.conciliacionId);

  devolver = (solicitud: FastifyRequest<{ Params: ParamsConciliacion; Body: SolicitudConMotivo }>) =>
    this.casosDeUso.devolver.ejecutar(operadorDe(solicitud), {
      conciliacionId: solicitud.params.conciliacionId,
      motivo: solicitud.body.motivo,
    });

  eliminar = async (
    solicitud: FastifyRequest<{ Params: ParamsConciliacion; Body: SolicitudConMotivo }>,
    respuesta: FastifyReply,
  ) => {
    await this.casosDeUso.eliminar.ejecutar(operadorDe(solicitud), {
      conciliacionId: solicitud.params.conciliacionId,
      motivo: solicitud.body.motivo,
    });
    return respuesta.status(204).send();
  };
}
