import { clienteHttp, type ClienteHttp, type Consulta } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';
import type { ReporteDeDocumentosAUnaFecha, ReporteDeSaldosPorProveedor } from './tipos-de-reportes';
import type {
  EstadoDeCuenta,
  ReporteDeContrasenasPorPagar,
  ReporteDeSaldosAFavor,
} from './tipos-de-reportes-de-proveedor';

export type * from './tipos-de-reportes';
export type * from './tipos-de-reportes-de-proveedor';

const RUTA = '/cuentas-por-pagar/reportes';
const RUTA_DE_SALDOS = `${RUTA}/saldos-por-proveedor`;
const RUTA_DE_DOCUMENTOS = `${RUTA}/documentos`;
const RUTA_DEL_ESTADO = `${RUTA}/estado-de-cuenta`;
const RUTA_DE_SALDOS_A_FAVOR = `${RUTA}/saldos-a-favor`;
const RUTA_DE_CONTRASENAS = `${RUTA}/contrasenas-por-pagar`;

/** Los reportes de Cuentas por pagar (solo se consultan y se exportan; no se importan). */
export class ApiReportesDeCuentasPorPagar {
  constructor(private readonly http: ClienteHttp) {}

  get intercambioDeSaldos() {
    return intercambioDe(this.http, RUTA_DE_SALDOS);
  }

  get intercambioDeDocumentos() {
    return intercambioDe(this.http, RUTA_DE_DOCUMENTOS);
  }

  get intercambioDelEstado() {
    return intercambioDe(this.http, RUTA_DEL_ESTADO);
  }

  get intercambioDeSaldosAFavor() {
    return intercambioDe(this.http, RUTA_DE_SALDOS_A_FAVOR);
  }

  get intercambioDeContrasenas() {
    return intercambioDe(this.http, RUTA_DE_CONTRASENAS);
  }

  saldosPorProveedor(consulta: Consulta) {
    return this.http.obtener<ReporteDeSaldosPorProveedor>(RUTA_DE_SALDOS, consulta);
  }

  documentos(consulta: Consulta) {
    return this.http.obtener<ReporteDeDocumentosAUnaFecha>(RUTA_DE_DOCUMENTOS, consulta);
  }

  estadoDeCuenta(consulta: Consulta) {
    return this.http.obtener<EstadoDeCuenta>(RUTA_DEL_ESTADO, consulta);
  }

  saldosAFavor(consulta: Consulta) {
    return this.http.obtener<ReporteDeSaldosAFavor>(RUTA_DE_SALDOS_A_FAVOR, consulta);
  }

  contrasenasPorPagar(consulta: Consulta) {
    return this.http.obtener<ReporteDeContrasenasPorPagar>(RUTA_DE_CONTRASENAS, consulta);
  }
}

export const apiReportesDeCuentasPorPagar = new ApiReportesDeCuentasPorPagar(clienteHttp);
