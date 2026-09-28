import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ActualizarMovimiento } from '../aplicacion/casos-uso/movimientos/actualizar-movimiento.js';
import type { AnularMovimiento } from '../aplicacion/casos-uso/movimientos/anular-movimiento.js';
import type { CrearMovimiento } from '../aplicacion/casos-uso/movimientos/crear-movimiento.js';
import type { ListarMovimientos } from '../aplicacion/casos-uso/movimientos/listar-movimientos.js';
import type { ObtenerMovimiento } from '../aplicacion/casos-uso/movimientos/obtener-movimiento.js';
import type {
  FiltroSolicitado,
  MovimientoSolicitado,
  ParamsMovimiento,
  SolicitudDeAnulacion,
} from './movimientos.esquemas-http.js';

export interface CasosDeUsoDeMovimientos {
  listar: ListarMovimientos;
  obtener: ObtenerMovimiento;
  crear: CrearMovimiento;
  actualizar: ActualizarMovimiento;
  anular: AnularMovimiento;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class MovimientosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeMovimientos) {}

  listar = (solicitud: FastifyRequest<{ Querystring: FiltroSolicitado }>) =>
    this.casosDeUso.listar.ejecutar(operadorDe(solicitud), solicitud.query);

  obtener = (solicitud: FastifyRequest<{ Params: ParamsMovimiento }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.movimientoId);

  crear = async (solicitud: FastifyRequest<{ Body: MovimientoSolicitado }>, respuesta: FastifyReply) => {
    const movimiento = await this.casosDeUso.crear.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(movimiento);
  };

  actualizar = (solicitud: FastifyRequest<{ Params: ParamsMovimiento; Body: MovimientoSolicitado }>) =>
    this.casosDeUso.actualizar.ejecutar(operadorDe(solicitud), {
      movimientoId: solicitud.params.movimientoId,
      solicitud: solicitud.body,
    });

  anular = (solicitud: FastifyRequest<{ Params: ParamsMovimiento; Body: SolicitudDeAnulacion }>) =>
    this.casosDeUso.anular.ejecutar(operadorDe(solicitud), {
      movimientoId: solicitud.params.movimientoId,
      motivo: solicitud.body.motivo,
    });
}
