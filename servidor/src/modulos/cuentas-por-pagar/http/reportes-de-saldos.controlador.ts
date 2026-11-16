import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ReporteDeDocumentosAUnaFecha } from '../aplicacion/casos-uso/reportes/reporte-de-documentos-a-una-fecha.js';
import type { ReporteDeSaldosPorProveedor } from '../aplicacion/casos-uso/reportes/reporte-de-saldos-por-proveedor.js';
import {
  separarPaginacion,
  type FiltroDeDocumentosAUnaFechaSolicitado,
  type FiltroDeSaldosPorProveedorSolicitado,
} from './reportes-de-saldos.esquemas-http.js';

export interface CasosDeUsoDeReportesDeSaldos {
  saldosPorProveedor: ReporteDeSaldosPorProveedor;
  documentos: ReporteDeDocumentosAUnaFecha;
}

/** Traduce las peticiones de los reportes de saldos a una fecha de corte (solo lectura) a sus casos de uso. */
export class ReportesDeSaldosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeReportesDeSaldos) {}

  saldosPorProveedor = (solicitud: FastifyRequest<{ Querystring: FiltroDeSaldosPorProveedorSolicitado }>) =>
    this.casosDeUso.saldosPorProveedor.ejecutar(operadorDe(solicitud), solicitud.query);

  documentos = (solicitud: FastifyRequest<{ Querystring: FiltroDeDocumentosAUnaFechaSolicitado }>) => {
    const { solicitud: filtro, pagina } = separarPaginacion(solicitud.query);
    return this.casosDeUso.documentos.ejecutar(operadorDe(solicitud), filtro, pagina);
  };
}
