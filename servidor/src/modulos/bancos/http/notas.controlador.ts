import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ActualizarMovimiento } from '../aplicacion/casos-uso/movimientos/actualizar-movimiento.js';
import type { AnularMovimiento } from '../aplicacion/casos-uso/movimientos/anular-movimiento.js';
import type { CrearMovimiento } from '../aplicacion/casos-uso/movimientos/crear-movimiento.js';
import type { EliminarMovimiento } from '../aplicacion/casos-uso/movimientos/eliminar-movimiento.js';
import type { ListarMovimientos } from '../aplicacion/casos-uso/movimientos/listar-movimientos.js';
import type { ReclasificarMovimientos } from '../aplicacion/casos-uso/movimientos/reclasificar-movimientos.js';
import type { ReclasificarVarios } from '../aplicacion/casos-uso/movimientos/reclasificar-varios.js';
import type { SugerirConceptoAlCapturar } from '../aplicacion/casos-uso/sugerencias/sugerir-concepto-al-capturar.js';
import type { SugerirConceptosDeSinClasificar } from '../aplicacion/casos-uso/sugerencias/sugerir-conceptos-de-sin-clasificar.js';
import type { ObtenerMovimiento } from '../aplicacion/casos-uso/movimientos/obtener-movimiento.js';
import type { ParamsMovimiento, SolicitudDeAnulacion, SolicitudDeEliminacion } from './movimientos.esquemas-http.js';
import type {
  FiltroDeNotasSolicitado,
  NotaSolicitada,
  ReclasificacionSolicitada,
  ReclasificacionVariosSolicitada,
} from './notas.esquemas-http.js';
import type { FiltroDeSugerenciasSolicitado, SugerenciaDeNotaSolicitada } from './sugerencias.esquemas-http.js';

export interface CasosDeUsoDeNotas {
  listar: ListarMovimientos;
  obtener: ObtenerMovimiento;
  crear: CrearMovimiento;
  actualizar: ActualizarMovimiento;
  anular: AnularMovimiento;
  eliminar: EliminarMovimiento;
  reclasificar: ReclasificarMovimientos;
  reclasificarVarios: ReclasificarVarios;
  sugerirDeSinClasificar: SugerirConceptosDeSinClasificar;
  sugerirAlCapturar: SugerirConceptoAlCapturar;
}

/** Traduce las peticiones HTTP a casos de uso; siempre como nota (`saldoInicial: false`), nunca como el saldo inicial. */
export class NotasControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeNotas) {}

  listar = (solicitud: FastifyRequest<{ Querystring: FiltroDeNotasSolicitado }>) =>
    this.casosDeUso.listar.ejecutar(operadorDe(solicitud), { ...solicitud.query, clase: 'notas' });

  obtener = (solicitud: FastifyRequest<{ Params: ParamsMovimiento }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.movimientoId);

  crear = async (solicitud: FastifyRequest<{ Body: NotaSolicitada }>, respuesta: FastifyReply) => {
    const nota = await this.casosDeUso.crear.ejecutar(operadorDe(solicitud), {
      ...solicitud.body,
      saldoInicial: false,
    });
    return respuesta.status(201).send(nota);
  };

  actualizar = (solicitud: FastifyRequest<{ Params: ParamsMovimiento; Body: NotaSolicitada }>) =>
    this.casosDeUso.actualizar.ejecutar(operadorDe(solicitud), {
      movimientoId: solicitud.params.movimientoId,
      solicitud: { ...solicitud.body, saldoInicial: false },
      esSaldoInicial: false,
    });

  reclasificar = (solicitud: FastifyRequest<{ Body: ReclasificacionSolicitada }>) =>
    this.casosDeUso.reclasificar.ejecutar(operadorDe(solicitud), solicitud.body);

  reclasificarVarios = (solicitud: FastifyRequest<{ Body: ReclasificacionVariosSolicitada }>) =>
    this.casosDeUso.reclasificarVarios.ejecutar(operadorDe(solicitud), solicitud.body);

  sugerenciasDeSinClasificar = (solicitud: FastifyRequest<{ Querystring: FiltroDeSugerenciasSolicitado }>) =>
    this.casosDeUso.sugerirDeSinClasificar.ejecutar(operadorDe(solicitud), solicitud.query);

  sugerirConcepto = (solicitud: FastifyRequest<{ Body: SugerenciaDeNotaSolicitada }>) =>
    this.casosDeUso.sugerirAlCapturar.ejecutar(operadorDe(solicitud), solicitud.body);

  anular = (solicitud: FastifyRequest<{ Params: ParamsMovimiento; Body: SolicitudDeAnulacion }>) =>
    this.casosDeUso.anular.ejecutar(operadorDe(solicitud), {
      movimientoId: solicitud.params.movimientoId,
      motivo: solicitud.body.motivo,
      fecha: solicitud.body.fecha,
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
