import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { CorregirSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/corregir-saldo-inicial.js';
import type {
  ListarSaldosIniciales,
  ObtenerSaldoInicial,
} from '../aplicacion/casos-uso/saldos-iniciales/consultas-de-saldos-iniciales.js';
import type { EliminarSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/eliminar-saldo-inicial.js';
import type { GuardarSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/guardar-saldo-inicial.js';
import type { ParamsSaldoInicial, SaldoInicialSolicitado } from './saldos-iniciales.esquemas-http.js';

export interface CasosDeUsoDeSaldosIniciales {
  listar: ListarSaldosIniciales;
  obtener: ObtenerSaldoInicial;
  guardar: GuardarSaldoInicial;
  corregir: CorregirSaldoInicial;
  eliminar: EliminarSaldoInicial;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class SaldosInicialesControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeSaldosIniciales) {}

  listar = (solicitud: FastifyRequest) => this.casosDeUso.listar.ejecutar(operadorDe(solicitud));

  obtener = (solicitud: FastifyRequest<{ Params: ParamsSaldoInicial }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.activoId);

  guardar = async (solicitud: FastifyRequest<{ Body: SaldoInicialSolicitado }>, respuesta: FastifyReply) => {
    const saldo = await this.casosDeUso.guardar.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(saldo);
  };

  corregir = (solicitud: FastifyRequest<{ Params: ParamsSaldoInicial; Body: SaldoInicialSolicitado }>) =>
    this.casosDeUso.corregir.ejecutar(operadorDe(solicitud), {
      activoId: solicitud.params.activoId,
      solicitud: solicitud.body,
    });

  eliminar = async (solicitud: FastifyRequest<{ Params: ParamsSaldoInicial }>, respuesta: FastifyReply) => {
    await this.casosDeUso.eliminar.ejecutar(operadorDe(solicitud), solicitud.params.activoId);
    return respuesta.status(204).send();
  };
}
