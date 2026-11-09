import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { CorregirSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/corregir-saldo-inicial.js';
import type { CrearSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/crear-saldo-inicial.js';
import type { EliminarSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/eliminar-saldo-inicial.js';
import type { ListarSaldosIniciales } from '../aplicacion/casos-uso/saldos-iniciales/listar-saldos-iniciales.js';
import type { ObtenerSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/obtener-saldo-inicial.js';
import type {
  EliminarSaldoInicialSolicitado,
  FiltroDeSaldosInicialesSolicitado,
  ParamsDeSaldoInicial,
  SaldoInicialSolicitado,
} from './saldos-iniciales.esquemas-http.js';

export interface CasosDeUsoDeSaldosIniciales {
  crear: CrearSaldoInicial;
  corregir: CorregirSaldoInicial;
  eliminar: EliminarSaldoInicial;
  listar: ListarSaldosIniciales;
  obtener: ObtenerSaldoInicial;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class SaldosInicialesControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeSaldosIniciales) {}

  listar = (solicitud: FastifyRequest<{ Querystring: FiltroDeSaldosInicialesSolicitado }>) => {
    const { pagina, limite, ...filtro } = solicitud.query;
    return this.casosDeUso.listar.ejecutar(operadorDe(solicitud), filtro, { pagina, limite });
  };

  obtener = (solicitud: FastifyRequest<{ Params: ParamsDeSaldoInicial }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.saldoInicialId);

  crear = async (solicitud: FastifyRequest<{ Body: SaldoInicialSolicitado }>, respuesta: FastifyReply) => {
    const creado = await this.casosDeUso.crear.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(creado);
  };

  corregir = (solicitud: FastifyRequest<{ Params: ParamsDeSaldoInicial; Body: SaldoInicialSolicitado }>) =>
    this.casosDeUso.corregir.ejecutar(operadorDe(solicitud), solicitud.params.saldoInicialId, solicitud.body);

  eliminar = async (
    solicitud: FastifyRequest<{ Params: ParamsDeSaldoInicial; Body: EliminarSaldoInicialSolicitado }>,
    respuesta: FastifyReply,
  ) => {
    const { saldoInicialId } = solicitud.params;
    await this.casosDeUso.eliminar.ejecutar(operadorDe(solicitud), saldoInicialId, solicitud.body.motivo);
    return respuesta.status(204).send();
  };
}
