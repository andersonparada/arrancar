import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ActualizarMovimiento } from '../aplicacion/casos-uso/movimientos/actualizar-movimiento.js';
import type { AnularMovimiento } from '../aplicacion/casos-uso/movimientos/anular-movimiento.js';
import type { CrearMovimiento } from '../aplicacion/casos-uso/movimientos/crear-movimiento.js';
import type { ListarMovimientos } from '../aplicacion/casos-uso/movimientos/listar-movimientos.js';
import type { ParamsMovimiento, SolicitudDeAnulacion } from './movimientos.esquemas-http.js';
import type { FiltroDeSaldosInicialesSolicitado, SaldoInicialSolicitado } from './saldos-iniciales.esquemas-http.js';

export interface CasosDeUsoDeSaldosIniciales {
  listar: ListarMovimientos;
  crear: CrearMovimiento;
  actualizar: ActualizarMovimiento;
  anular: AnularMovimiento;
}

/** Traduce las peticiones HTTP a casos de uso; siempre como el saldo inicial (`saldoInicial: true`), nunca como nota. */
export class SaldosInicialesControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeSaldosIniciales) {}

  listar = (solicitud: FastifyRequest<{ Querystring: FiltroDeSaldosInicialesSolicitado }>) =>
    this.casosDeUso.listar.ejecutar(operadorDe(solicitud), { ...solicitud.query, clase: 'saldosIniciales' });

  crear = async (solicitud: FastifyRequest<{ Body: SaldoInicialSolicitado }>, respuesta: FastifyReply) => {
    const saldoInicial = await this.casosDeUso.crear.ejecutar(operadorDe(solicitud), {
      ...solicitud.body,
      beneficiario: null,
      saldoInicial: true,
    });
    return respuesta.status(201).send(saldoInicial);
  };

  actualizar = (solicitud: FastifyRequest<{ Params: ParamsMovimiento; Body: SaldoInicialSolicitado }>) =>
    this.casosDeUso.actualizar.ejecutar(operadorDe(solicitud), {
      movimientoId: solicitud.params.movimientoId,
      solicitud: { ...solicitud.body, beneficiario: null, saldoInicial: true },
      esSaldoInicial: true,
    });

  anular = (solicitud: FastifyRequest<{ Params: ParamsMovimiento; Body: SolicitudDeAnulacion }>) =>
    this.casosDeUso.anular.ejecutar(operadorDe(solicitud), {
      movimientoId: solicitud.params.movimientoId,
      motivo: solicitud.body.motivo,
      esSaldoInicial: true,
    });
}
