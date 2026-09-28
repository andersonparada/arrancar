import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { CambiarSaldoSegunBanco } from '../aplicacion/casos-uso/conciliaciones/cambiar-saldo-segun-banco.js';
import type { CerrarConciliacion } from '../aplicacion/casos-uso/conciliaciones/cerrar-conciliacion.js';
import type { EliminarConciliacion } from '../aplicacion/casos-uso/conciliaciones/eliminar-conciliacion.js';
import type { IniciarConciliacion } from '../aplicacion/casos-uso/conciliaciones/iniciar-conciliacion.js';
import type { ListarConciliaciones } from '../aplicacion/casos-uso/conciliaciones/listar-conciliaciones.js';
import type { MarcarMovimientos } from '../aplicacion/casos-uso/conciliaciones/marcar-movimientos.js';
import type { ObtenerConciliacion } from '../aplicacion/casos-uso/conciliaciones/obtener-conciliacion.js';
import type {
  InicioDeConciliacionSolicitado,
  MarcasSolicitadas,
  ParamsConciliacion,
  ParamsCuentaBancariaDeConciliaciones,
  SaldoSegunBancoSolicitado,
  SolicitudDeEliminacionDeConciliacion,
} from './conciliaciones.esquemas-http.js';

export interface CasosDeUsoDeConciliaciones {
  listar: ListarConciliaciones;
  obtener: ObtenerConciliacion;
  iniciar: IniciarConciliacion;
  marcar: MarcarMovimientos;
  cambiarSaldo: CambiarSaldoSegunBanco;
  cerrar: CerrarConciliacion;
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

  cambiarSaldo = (solicitud: FastifyRequest<{ Params: ParamsConciliacion; Body: SaldoSegunBancoSolicitado }>) =>
    this.casosDeUso.cambiarSaldo.ejecutar(operadorDe(solicitud), {
      conciliacionId: solicitud.params.conciliacionId,
      saldoSegunBanco: solicitud.body.saldoSegunBanco,
    });

  cerrar = (solicitud: FastifyRequest<{ Params: ParamsConciliacion }>) =>
    this.casosDeUso.cerrar.ejecutar(operadorDe(solicitud), solicitud.params.conciliacionId);

  eliminar = async (
    solicitud: FastifyRequest<{ Params: ParamsConciliacion; Body: SolicitudDeEliminacionDeConciliacion }>,
    respuesta: FastifyReply,
  ) => {
    await this.casosDeUso.eliminar.ejecutar(operadorDe(solicitud), {
      conciliacionId: solicitud.params.conciliacionId,
      motivo: solicitud.body.motivo,
    });
    return respuesta.status(204).send();
  };
}
