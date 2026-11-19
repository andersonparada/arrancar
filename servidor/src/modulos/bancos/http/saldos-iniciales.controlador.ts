import type { FastifyReply, FastifyRequest } from 'fastify';
import { contextoDe } from '../../core/compartido/http/contexto-de-la-solicitud.js';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { AgregarPartidaDeApertura } from '../aplicacion/casos-uso/saldos-iniciales/agregar-partida-de-apertura.js';
import type { AnularPartidaDeApertura } from '../aplicacion/casos-uso/saldos-iniciales/anular-partida-de-apertura.js';
import type { CorregirPartidaDeApertura } from '../aplicacion/casos-uso/saldos-iniciales/corregir-partida-de-apertura.js';
import type { EliminarPartidaDeApertura } from '../aplicacion/casos-uso/saldos-iniciales/eliminar-partida-de-apertura.js';
import type { EliminarSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/eliminar-saldo-inicial.js';
import type { GuardarSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/guardar-saldo-inicial.js';
import type { ListarSaldosIniciales } from '../aplicacion/casos-uso/saldos-iniciales/listar-saldos-iniciales.js';
import type { ObtenerSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/obtener-saldo-inicial.js';
import type { RevisarCierreDeCargaEnBancos } from '../aplicacion/casos-uso/saldos-iniciales/revisar-cierre-de-carga-en-bancos.js';
import type { SolicitudDeEliminacion } from './movimientos.esquemas-http.js';
import type {
  AnulacionDePartidaSolicitada,
  CorreccionDePartidaSolicitada,
  GuardarSaldoInicialSolicitado,
  ParamsDeCuenta,
  ParamsDePartida,
  PartidaSolicitada,
} from './saldos-iniciales.esquemas-http.js';

export interface CasosDeUsoDeSaldosIniciales {
  listar: ListarSaldosIniciales;
  obtener: ObtenerSaldoInicial;
  guardar: GuardarSaldoInicial;
  eliminar: EliminarSaldoInicial;
  agregarPartida: AgregarPartidaDeApertura;
  corregirPartida: CorregirPartidaDeApertura;
  eliminarPartida: EliminarPartidaDeApertura;
  anularPartida: AnularPartidaDeApertura;
  revisarCierre: RevisarCierreDeCargaEnBancos;
}

/** Traduce las peticiones HTTP de los saldos iniciales con partidas a casos de uso. Controlador delgado. */
export class SaldosInicialesControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeSaldosIniciales) {}

  listar = (solicitud: FastifyRequest) => this.casosDeUso.listar.ejecutar(operadorDe(solicitud));

  revisionDeCierre = (solicitud: FastifyRequest) => this.casosDeUso.revisarCierre.ejecutar(operadorDe(solicitud));

  obtener = (solicitud: FastifyRequest<{ Params: ParamsDeCuenta }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.cuentaBancariaId);

  /** La ruta deja pasar con crear o con editar; el caso de uso exige el que corresponde. */
  guardar = (solicitud: FastifyRequest<{ Params: ParamsDeCuenta; Body: GuardarSaldoInicialSolicitado }>) => {
    const { permisos } = contextoDe(solicitud);
    return this.casosDeUso.guardar.ejecutar(operadorDe(solicitud), {
      solicitud: { ...solicitud.body, cuentaBancariaId: solicitud.params.cuentaBancariaId },
      puedeCrear: permisos.has('bancos.saldos-iniciales.crear'),
      puedeEditar: permisos.has('bancos.saldos-iniciales.editar'),
    });
  };

  eliminar = async (
    solicitud: FastifyRequest<{ Params: ParamsDeCuenta; Body: SolicitudDeEliminacion }>,
    respuesta: FastifyReply,
  ) => {
    const { cuentaBancariaId } = solicitud.params;
    await this.casosDeUso.eliminar.ejecutar(operadorDe(solicitud), { cuentaBancariaId, motivo: solicitud.body.motivo });
    return respuesta.status(204).send();
  };

  agregarPartida = async (
    solicitud: FastifyRequest<{ Params: ParamsDeCuenta; Body: PartidaSolicitada }>,
    respuesta: FastifyReply,
  ) => {
    const { cuentaBancariaId } = solicitud.params;
    const guardada = await this.casosDeUso.agregarPartida.ejecutar(operadorDe(solicitud), {
      ...solicitud.body,
      cuentaBancariaId,
    });
    return respuesta.status(201).send(guardada);
  };

  corregirPartida = (solicitud: FastifyRequest<{ Params: ParamsDePartida; Body: CorreccionDePartidaSolicitada }>) =>
    this.casosDeUso.corregirPartida.ejecutar(operadorDe(solicitud), { ...solicitud.body, ...solicitud.params });

  anularPartida = (solicitud: FastifyRequest<{ Params: ParamsDePartida; Body: AnulacionDePartidaSolicitada }>) =>
    this.casosDeUso.anularPartida.ejecutar(operadorDe(solicitud), { ...solicitud.body, ...solicitud.params });

  eliminarPartida = async (
    solicitud: FastifyRequest<{ Params: ParamsDePartida; Body: SolicitudDeEliminacion }>,
    respuesta: FastifyReply,
  ) => {
    await this.casosDeUso.eliminarPartida.ejecutar(operadorDe(solicitud), {
      ...solicitud.params,
      motivo: solicitud.body.motivo,
    });
    return respuesta.status(204).send();
  };
}
