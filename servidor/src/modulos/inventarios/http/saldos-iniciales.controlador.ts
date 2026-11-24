import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { CorregirSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/corregir-saldo-inicial.js';
import type { EliminarSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/eliminar-saldo-inicial.js';
import type { ListarSaldosIniciales } from '../aplicacion/casos-uso/saldos-iniciales/listar-saldos-iniciales.js';
import type { RegistrarSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/registrar-saldo-inicial.js';
import { pantallaSegunLaVista, saldoSegunLaVista } from '../aplicacion/casos-uso/saldos-iniciales/vista-de-saldos.js';
import { vistaDe } from './vista-de-la-solicitud.js';
import type { ParamsSaldoInicial, SaldoInicialSolicitado } from './saldos-iniciales.esquemas-http.js';

export interface CasosDeUsoDeSaldosIniciales {
  listar: ListarSaldosIniciales;
  registrar: RegistrarSaldoInicial;
  corregir: CorregirSaldoInicial;
  eliminar: EliminarSaldoInicial;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class SaldosInicialesControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeSaldosIniciales) {}

  /** Sin `costos.ver`, ni la lista ni lo que responden registrar y corregir llevan dinero (INV-A7). */
  listar = async (solicitud: FastifyRequest) =>
    pantallaSegunLaVista(await this.casosDeUso.listar.ejecutar(operadorDe(solicitud)), vistaDe(solicitud));

  registrar = async (solicitud: FastifyRequest<{ Body: SaldoInicialSolicitado }>, respuesta: FastifyReply) => {
    const saldo = await this.casosDeUso.registrar.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(saldoSegunLaVista(saldo, vistaDe(solicitud)));
  };

  corregir = async (solicitud: FastifyRequest<{ Params: ParamsSaldoInicial; Body: SaldoInicialSolicitado }>) => {
    const { movimientoId } = solicitud.params;
    const saldo = await this.casosDeUso.corregir.ejecutar(operadorDe(solicitud), movimientoId, solicitud.body);
    return saldoSegunLaVista(saldo, vistaDe(solicitud));
  };

  eliminar = async (solicitud: FastifyRequest<{ Params: ParamsSaldoInicial }>, respuesta: FastifyReply) => {
    await this.casosDeUso.eliminar.ejecutar(operadorDe(solicitud), solicitud.params.movimientoId);
    return respuesta.status(204).send();
  };
}
