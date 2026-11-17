import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ReporteDeAjustesDelMes } from '../aplicacion/casos-uso/reportes/reporte-de-ajustes-del-mes.js';
import type { ReporteDeChequesPosfechados } from '../aplicacion/casos-uso/reportes/reporte-de-cheques-posfechados.js';
import type { ReporteDePagosRealizados } from '../aplicacion/casos-uso/reportes/reporte-de-pagos-realizados.js';
import {
  separarPaginacionDePagos,
  type FiltroDeAjustesDelMesSolicitado,
  type FiltroDeChequesPosfechadosSolicitado,
  type FiltroDePagosRealizadosSolicitado,
} from './reportes-de-pagos.esquemas-http.js';

export interface CasosDeUsoDeReportesDePagos {
  pagosRealizados: ReporteDePagosRealizados;
  chequesPosfechados: ReporteDeChequesPosfechados;
  ajustesDelMes: ReporteDeAjustesDelMes;
}

/** Traduce las peticiones de R6, R7 y R8 (solo lectura) a sus casos de uso. */
export class ReportesDePagosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeReportesDePagos) {}

  pagosRealizados = (solicitud: FastifyRequest<{ Querystring: FiltroDePagosRealizadosSolicitado }>) => {
    const { solicitud: filtro, pagina } = separarPaginacionDePagos(solicitud.query);
    return this.casosDeUso.pagosRealizados.ejecutar(operadorDe(solicitud), filtro, pagina);
  };

  chequesPosfechados = (solicitud: FastifyRequest<{ Querystring: FiltroDeChequesPosfechadosSolicitado }>) =>
    this.casosDeUso.chequesPosfechados.ejecutar(operadorDe(solicitud), solicitud.query);

  ajustesDelMes = (solicitud: FastifyRequest<{ Querystring: FiltroDeAjustesDelMesSolicitado }>) =>
    this.casosDeUso.ajustesDelMes.ejecutar(operadorDe(solicitud), solicitud.query);
}
