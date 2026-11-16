import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ReporteDeContrasenasPorPagar } from '../aplicacion/casos-uso/reportes/reporte-de-contrasenas-por-pagar.js';
import type { ReporteDeEstadoDeCuenta } from '../aplicacion/casos-uso/reportes/reporte-de-estado-de-cuenta.js';
import type { ReporteDeSaldosAFavor } from '../aplicacion/casos-uso/reportes/reporte-de-saldos-a-favor.js';
import type {
  FiltroDeContrasenasPorPagarSolicitado,
  FiltroDeEstadoDeCuentaSolicitado,
  FiltroDeSaldosAFavorSolicitado,
} from './reportes-de-proveedor.esquemas-http.js';

export interface CasosDeUsoDeReportesDeProveedor {
  estadoDeCuenta: ReporteDeEstadoDeCuenta;
  saldosAFavor: ReporteDeSaldosAFavor;
  contrasenasPorPagar: ReporteDeContrasenasPorPagar;
}

/** Traduce las peticiones de R3, R4 y R5 (solo lectura) a sus casos de uso. */
export class ReportesDeProveedorControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeReportesDeProveedor) {}

  estadoDeCuenta = (solicitud: FastifyRequest<{ Querystring: FiltroDeEstadoDeCuentaSolicitado }>) =>
    this.casosDeUso.estadoDeCuenta.ejecutar(operadorDe(solicitud), solicitud.query, { sinTope: false });

  saldosAFavor = (solicitud: FastifyRequest<{ Querystring: FiltroDeSaldosAFavorSolicitado }>) =>
    this.casosDeUso.saldosAFavor.ejecutar(operadorDe(solicitud), solicitud.query);

  contrasenasPorPagar = (solicitud: FastifyRequest<{ Querystring: FiltroDeContrasenasPorPagarSolicitado }>) =>
    this.casosDeUso.contrasenasPorPagar.ejecutar(operadorDe(solicitud), solicitud.query);
}
