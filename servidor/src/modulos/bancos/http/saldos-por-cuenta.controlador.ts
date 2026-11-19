import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ReporteDeSaldosPorCuenta } from '../aplicacion/casos-uso/saldos-por-cuenta/reporte-de-saldos-por-cuenta.js';
import type { FiltroDeSaldosSolicitado } from './saldos-por-cuenta.esquemas-http.js';

/** Traduce la petición del reporte «Saldos por cuenta» (solo lectura) a su caso de uso. */
export class SaldosPorCuentaControlador {
  constructor(private readonly reporte: ReporteDeSaldosPorCuenta) {}

  reporteDeSaldos = (solicitud: FastifyRequest<{ Querystring: FiltroDeSaldosSolicitado }>) =>
    this.reporte.ejecutar(operadorDe(solicitud), solicitud.query);
}
