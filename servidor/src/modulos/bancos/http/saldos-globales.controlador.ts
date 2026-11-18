import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ActualizarMovimiento } from '../aplicacion/casos-uso/movimientos/actualizar-movimiento.js';
import type { CrearMovimiento } from '../aplicacion/casos-uso/movimientos/crear-movimiento.js';
import type { EliminarSaldoGlobal } from '../aplicacion/casos-uso/movimientos/eliminar-saldo-global.js';
import type { ListarMovimientos } from '../aplicacion/casos-uso/movimientos/listar-movimientos.js';
import type { ParamsMovimiento, SolicitudDeEliminacion } from './movimientos.esquemas-http.js';
import type { SaldoGlobalSolicitado } from './saldos-globales.esquemas-http.js';

export interface CasosDeUsoDeSaldosGlobales {
  listar: ListarMovimientos;
  crear: CrearMovimiento;
  actualizar: ActualizarMovimiento;
  eliminar: EliminarSaldoGlobal;
}

/**
 * HEREDADO (hasta BS-5): el cliente actual todavía registra el saldo inicial de una cuenta como un solo movimiento
 * (`saldo_global`), sin partidas. Siempre como el saldo inicial (`saldoInicial: true`), nunca como nota; no se anula.
 */
export class SaldosGlobalesControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeSaldosGlobales) {}

  /** El saldo inicial vigente (y los anulados) de la cuenta, como lo lee el cliente actual. */
  listarDeLaCuenta = (operador: Operador, cuentaBancariaId: string) =>
    this.casosDeUso.listar.ejecutar(operador, { cuentaBancariaId, clase: 'saldosIniciales' });

  crear = async (solicitud: FastifyRequest<{ Body: SaldoGlobalSolicitado }>, respuesta: FastifyReply) => {
    const saldoInicial = await this.casosDeUso.crear.ejecutar(operadorDe(solicitud), {
      ...solicitud.body,
      beneficiario: null,
      saldoInicial: true,
    });
    return respuesta.status(201).send(saldoInicial);
  };

  actualizar = (solicitud: FastifyRequest<{ Params: ParamsMovimiento; Body: SaldoGlobalSolicitado }>) =>
    this.casosDeUso.actualizar.ejecutar(operadorDe(solicitud), {
      movimientoId: solicitud.params.movimientoId,
      solicitud: { ...solicitud.body, beneficiario: null, saldoInicial: true },
      esSaldoInicial: true,
    });

  eliminar = async (
    solicitud: FastifyRequest<{ Params: ParamsMovimiento; Body: SolicitudDeEliminacion }>,
    respuesta: FastifyReply,
  ) => {
    await this.casosDeUso.eliminar.ejecutar(operadorDe(solicitud), {
      movimientoId: solicitud.params.movimientoId,
      motivo: solicitud.body.motivo,
    });
    return respuesta.status(204).send();
  };
}
