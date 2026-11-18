import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type {
  ListarPagos,
  ObtenerComprobanteDePago,
  ObtenerPago,
} from '../aplicacion/casos-uso/pagos/consultas-de-la-ficha-de-pagos.js';
import type { ListaDePagosSolicitada } from './consulta-de-pagos.esquemas-http.js';
import type { ParamsDePago } from './pagos.esquemas-http.js';

export interface CasosDeUsoDeConsultaDePagos {
  listar: ListarPagos;
  obtener: ObtenerPago;
  comprobante: ObtenerComprobanteDePago;
}

/** Traduce las consultas de pagos (lista, ficha y comprobante) a casos de uso; no contiene reglas de negocio. */
export class ConsultaDePagosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeConsultaDePagos) {}

  listar = (solicitud: FastifyRequest<{ Querystring: ListaDePagosSolicitada }>) =>
    this.casosDeUso.listar.ejecutar(operadorDe(solicitud), solicitud.query);

  obtener = (solicitud: FastifyRequest<{ Params: ParamsDePago }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.id);

  comprobante = (solicitud: FastifyRequest<{ Params: ParamsDePago }>) =>
    this.casosDeUso.comprobante.ejecutar(operadorDe(solicitud), solicitud.params.id);
}
