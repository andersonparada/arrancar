import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { CambiarControlDePeriodos } from '../aplicacion/casos-uso/periodos/cambiar-control-de-periodos.js';
import type { ListarPeriodos, ObtenerPeriodo } from '../aplicacion/casos-uso/periodos/consultar-periodos.js';
import type { DeclararPeriodo } from '../aplicacion/casos-uso/periodos/declarar-periodo.js';
import type { ReabrirPeriodo } from '../aplicacion/casos-uso/periodos/reabrir-periodo.js';
import type {
  ApagarControlSolicitado,
  ConsultaDePeriodosSolicitada,
  DeclaracionSolicitada,
  ParamsDePeriodo,
  ReaperturaSolicitada,
} from './periodos.esquemas-http.js';

export interface CasosDeUsoDePeriodos {
  listar: ListarPeriodos;
  obtener: ObtenerPeriodo;
  declarar: DeclararPeriodo;
  reabrir: ReabrirPeriodo;
  control: CambiarControlDePeriodos;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class PeriodosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDePeriodos) {}

  listar = (solicitud: FastifyRequest<{ Querystring: ConsultaDePeriodosSolicitada }>) =>
    this.casosDeUso.listar.ejecutar(operadorDe(solicitud), solicitud.query.anio);

  obtener = (solicitud: FastifyRequest<{ Params: ParamsDePeriodo }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.periodo);

  declarar = (solicitud: FastifyRequest<{ Params: ParamsDePeriodo; Body: DeclaracionSolicitada }>) =>
    this.casosDeUso.declarar.ejecutar(operadorDe(solicitud), { ...solicitud.body, periodo: solicitud.params.periodo });

  reabrir = (solicitud: FastifyRequest<{ Params: ParamsDePeriodo; Body: ReaperturaSolicitada }>) =>
    this.casosDeUso.reabrir.ejecutar(operadorDe(solicitud), { ...solicitud.body, periodo: solicitud.params.periodo });

  encenderControl = (solicitud: FastifyRequest) =>
    this.casosDeUso.control.ejecutar(operadorDe(solicitud), { encendido: true });

  apagarControl = (solicitud: FastifyRequest<{ Body: ApagarControlSolicitado }>) =>
    this.casosDeUso.control.ejecutar(operadorDe(solicitud), { encendido: false, motivo: solicitud.body.motivo });
}
