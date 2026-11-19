import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { CerrarMes } from '../aplicacion/casos-uso/depreciacion/cerrar-mes.js';
import type { ListarCierres } from '../aplicacion/casos-uso/depreciacion/listar-cierres.js';
import type { ReabrirMes } from '../aplicacion/casos-uso/depreciacion/reabrir-mes.js';
import type { RevisarCierre } from '../aplicacion/casos-uso/depreciacion/revisar-cierre.js';
import type { CierreSolicitado, ParamsPeriodo, ReaperturaSolicitada } from './depreciacion.esquemas-http.js';

export interface CasosDeUsoDeDepreciacion {
  listar: ListarCierres;
  revisar: RevisarCierre;
  cerrar: CerrarMes;
  reabrir: ReabrirMes;
}

/** Traduce las peticiones HTTP del cierre de depreciación a casos de uso; no contiene reglas de negocio. */
export class DepreciacionControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeDepreciacion) {}

  listar = (solicitud: FastifyRequest) => this.casosDeUso.listar.ejecutar(operadorDe(solicitud));

  revisar = (solicitud: FastifyRequest<{ Params: ParamsPeriodo }>) =>
    this.casosDeUso.revisar.ejecutar(operadorDe(solicitud), solicitud.params.periodo);

  cerrar = (solicitud: FastifyRequest<{ Params: ParamsPeriodo; Body: CierreSolicitado }>) =>
    this.casosDeUso.cerrar.ejecutar(operadorDe(solicitud), {
      periodo: solicitud.params.periodo,
      huella: solicitud.body.huella,
    });

  reabrir = (solicitud: FastifyRequest<{ Params: ParamsPeriodo; Body: ReaperturaSolicitada }>) =>
    this.casosDeUso.reabrir.ejecutar(operadorDe(solicitud), {
      periodo: solicitud.params.periodo,
      motivo: solicitud.body.motivo,
    });
}
