import type { FastifyReply, FastifyRequest } from 'fastify';
import { leerDocumentoDeSolicitud } from '../../core/archivos/http/leer-documento.js';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { AbrirEstadoDeCuenta } from '../aplicacion/casos-uso/conciliaciones/abrir-estado-de-cuenta.js';
import type { AutorizarConciliacion } from '../aplicacion/casos-uso/conciliaciones/autorizar-conciliacion.js';
import type { DesmarcarNotaEnConciliacion } from '../aplicacion/casos-uso/conciliaciones/desmarcar-nota-en-conciliacion.js';
import type { DevolverConciliacion } from '../aplicacion/casos-uso/conciliaciones/devolver-conciliacion.js';
import type { EliminarConciliacion } from '../aplicacion/casos-uso/conciliaciones/eliminar-conciliacion.js';
import type { IniciarConciliacion } from '../aplicacion/casos-uso/conciliaciones/iniciar-conciliacion.js';
import type { ListarConciliaciones } from '../aplicacion/casos-uso/conciliaciones/listar-conciliaciones.js';
import type { MarcarMovimientos } from '../aplicacion/casos-uso/conciliaciones/marcar-movimientos.js';
import type { ObtenerConciliacion } from '../aplicacion/casos-uso/conciliaciones/obtener-conciliacion.js';
import type { QuitarEstadoDeCuenta } from '../aplicacion/casos-uso/conciliaciones/quitar-estado-de-cuenta.js';
import type { SubirEstadoDeCuenta } from '../aplicacion/casos-uso/conciliaciones/subir-estado-de-cuenta.js';
import type { TerminarConciliacion } from '../aplicacion/casos-uso/conciliaciones/terminar-conciliacion.js';
import type { TranscribirSaldo } from '../aplicacion/casos-uso/conciliaciones/transcribir-saldo.js';
import type {
  DesmarcadoEnConciliacionSolicitado,
  InicioDeConciliacionSolicitado,
  MarcasSolicitadas,
  ParamsConciliacion,
  ParamsCuentaBancariaDeConciliaciones,
  ParamsNotaDeConciliacion,
  SaldoDelEstadoDeCuentaSolicitado,
  SolicitudConMotivo,
} from './conciliaciones.esquemas-http.js';

export interface CasosDeUsoDeConciliaciones {
  listar: ListarConciliaciones;
  obtener: ObtenerConciliacion;
  iniciar: IniciarConciliacion;
  marcar: MarcarMovimientos;
  transcribirSaldo: TranscribirSaldo;
  subirEstadoDeCuenta: SubirEstadoDeCuenta;
  quitarEstadoDeCuenta: QuitarEstadoDeCuenta;
  abrirEstadoDeCuenta: AbrirEstadoDeCuenta;
  terminar: TerminarConciliacion;
  autorizar: AutorizarConciliacion;
  devolver: DevolverConciliacion;
  eliminar: EliminarConciliacion;
  desmarcarNota: DesmarcarNotaEnConciliacion;
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

  transcribirSaldo = (
    solicitud: FastifyRequest<{ Params: ParamsConciliacion; Body: SaldoDelEstadoDeCuentaSolicitado }>,
  ) =>
    this.casosDeUso.transcribirSaldo.ejecutar(operadorDe(solicitud), {
      conciliacionId: solicitud.params.conciliacionId,
      saldo: solicitud.body.saldoEstadoDeCuenta,
    });

  subirEstadoDeCuenta = async (solicitud: FastifyRequest<{ Params: ParamsConciliacion }>) => {
    const { contenido, nombre } = await leerDocumentoDeSolicitud(solicitud);
    return this.casosDeUso.subirEstadoDeCuenta.ejecutar(operadorDe(solicitud), {
      conciliacionId: solicitud.params.conciliacionId,
      contenido,
      nombre,
    });
  };

  quitarEstadoDeCuenta = (solicitud: FastifyRequest<{ Params: ParamsConciliacion }>) =>
    this.casosDeUso.quitarEstadoDeCuenta.ejecutar(operadorDe(solicitud), solicitud.params.conciliacionId);

  abrirEstadoDeCuenta = async (solicitud: FastifyRequest<{ Params: ParamsConciliacion }>, respuesta: FastifyReply) => {
    const archivo = await this.casosDeUso.abrirEstadoDeCuenta.ejecutar(
      operadorDe(solicitud),
      solicitud.params.conciliacionId,
    );
    return respuesta
      .header('Content-Type', archivo.tipoMime)
      .header('Content-Disposition', `inline; filename="${archivo.nombre}"`)
      .header('Cache-Control', 'private, no-store')
      .send(archivo.contenido);
  };

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

  desmarcarNota = (
    solicitud: FastifyRequest<{ Params: ParamsNotaDeConciliacion; Body: DesmarcadoEnConciliacionSolicitado }>,
  ) => this.casosDeUso.desmarcarNota.ejecutar(operadorDe(solicitud), { ...solicitud.params, ...solicitud.body });
}
