import { clienteHttp, type ClienteHttp, type Consulta } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';
import type { ReporteDeDocumentosAUnaFecha, ReporteDeSaldosPorProveedor } from './tipos-de-reportes';

export type * from './tipos-de-reportes';

const RUTA = '/cuentas-por-pagar/reportes';
const RUTA_DE_SALDOS = `${RUTA}/saldos-por-proveedor`;
const RUTA_DE_DOCUMENTOS = `${RUTA}/documentos`;

/** Los reportes de Cuentas por pagar (solo se consultan y se exportan; no se importan). */
export class ApiReportesDeCuentasPorPagar {
  constructor(private readonly http: ClienteHttp) {}

  get intercambioDeSaldos() {
    return intercambioDe(this.http, RUTA_DE_SALDOS);
  }

  get intercambioDeDocumentos() {
    return intercambioDe(this.http, RUTA_DE_DOCUMENTOS);
  }

  saldosPorProveedor(consulta: Consulta) {
    return this.http.obtener<ReporteDeSaldosPorProveedor>(RUTA_DE_SALDOS, consulta);
  }

  documentos(consulta: Consulta) {
    return this.http.obtener<ReporteDeDocumentosAUnaFecha>(RUTA_DE_DOCUMENTOS, consulta);
  }
}

export const apiReportesDeCuentasPorPagar = new ApiReportesDeCuentasPorPagar(clienteHttp);
