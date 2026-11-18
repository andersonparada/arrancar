import { clienteHttp, type ClienteHttp, type Consulta } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';
import type { ReporteDeAjustesDelMes } from './tipos-de-reportes-de-control';
import type { ReporteDeChequesPosfechados, ReporteDePagosRealizados } from './tipos-de-reportes-de-pagos';
import type { ReporteDeDocumentosAUnaFecha, ReporteDeSaldosPorProveedor } from './tipos-de-reportes';
import type {
  EstadoDeCuenta,
  ReporteDeContrasenasPorPagar,
  ReporteDeSaldosAFavor,
} from './tipos-de-reportes-de-proveedor';

export type * from './tipos-de-reportes';
export type * from './tipos-de-reportes-de-proveedor';
export type * from './tipos-de-reportes-de-pagos';
export type * from './tipos-de-reportes-de-control';

const RUTA = '/cuentas-por-pagar/reportes';
const RUTA_DE_SALDOS = `${RUTA}/saldos-por-proveedor`;
const RUTA_DE_DOCUMENTOS = `${RUTA}/documentos`;
const RUTA_DEL_ESTADO = `${RUTA}/estado-de-cuenta`;
const RUTA_DE_SALDOS_A_FAVOR = `${RUTA}/saldos-a-favor`;
const RUTA_DE_CONTRASENAS = `${RUTA}/contrasenas-por-pagar`;
const RUTA_DE_PAGOS = `${RUTA}/pagos`;
const RUTA_DE_CHEQUES = `${RUTA}/cheques-posfechados`;
const RUTA_DE_AJUSTES = `${RUTA}/ajustes-del-mes`;

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

  get intercambioDePagos() {
    return intercambioDe(this.http, RUTA_DE_PAGOS);
  }

  get intercambioDeCheques() {
    return intercambioDe(this.http, RUTA_DE_CHEQUES);
  }

  get intercambioDeAjustes() {
    return intercambioDe(this.http, RUTA_DE_AJUSTES);
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

  pagosRealizados(consulta: Consulta) {
    return this.http.obtener<ReporteDePagosRealizados>(RUTA_DE_PAGOS, consulta);
  }

  chequesPosfechados(consulta: Consulta) {
    return this.http.obtener<ReporteDeChequesPosfechados>(RUTA_DE_CHEQUES, consulta);
  }

  ajustesDelMes(consulta: Consulta) {
    return this.http.obtener<ReporteDeAjustesDelMes>(RUTA_DE_AJUSTES, consulta);
  }
}

export const apiReportesDeCuentasPorPagar = new ApiReportesDeCuentasPorPagar(clienteHttp);
