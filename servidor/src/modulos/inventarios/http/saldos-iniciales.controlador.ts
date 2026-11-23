import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { CorregirSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/corregir-saldo-inicial.js';
import type { EliminarSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/eliminar-saldo-inicial.js';
import type { ListarSaldosIniciales } from '../aplicacion/casos-uso/saldos-iniciales/listar-saldos-iniciales.js';
import type { RegistrarSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/registrar-saldo-inicial.js';
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

  listar = (solicitud: FastifyRequest) => this.casosDeUso.listar.ejecutar(operadorDe(solicitud));

  registrar = async (solicitud: FastifyRequest<{ Body: SaldoInicialSolicitado }>, respuesta: FastifyReply) => {
    const saldo = await this.casosDeUso.registrar.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(saldo);
  };

  corregir = (solicitud: FastifyRequest<{ Params: ParamsSaldoInicial; Body: SaldoInicialSolicitado }>) =>
    this.casosDeUso.corregir.ejecutar(operadorDe(solicitud), solicitud.params.movimientoId, solicitud.body);

  eliminar = async (solicitud: FastifyRequest<{ Params: ParamsSaldoInicial }>, respuesta: FastifyReply) => {
    await this.casosDeUso.eliminar.ejecutar(operadorDe(solicitud), solicitud.params.movimientoId);
    return respuesta.status(204).send();
  };
}
