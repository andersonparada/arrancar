import { clienteHttp, type ClienteHttp, type Consulta } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';
import type {
  ReporteDeArqueos,
  ReporteDeEstadoDeFondos,
  ReporteDePendientes,
  ReporteDeReposiciones,
  ReporteSinDocumento,
} from './tipos-de-reportes';

export type * from './tipos-de-reportes';

const RUTA = '/caja-chica/reportes';
const RUTA_DE_PENDIENTES = `${RUTA}/pendientes-de-reponer`;
const RUTA_DE_REPOSICIONES = `${RUTA}/reposiciones`;
const RUTA_SIN_DOCUMENTO = `${RUTA}/sin-documento-fiscal`;
const RUTA_DE_ESTADO = `${RUTA}/estado-de-fondos`;
const RUTA_DE_ARQUEOS = `${RUTA}/arqueos`;

/** Los reportes de Caja chica (solo se consultan y se exportan; no se importan). */
export class ApiReportesDeCajaChica {
  constructor(private readonly http: ClienteHttp) {}

  get intercambioDePendientes() {
    return intercambioDe(this.http, RUTA_DE_PENDIENTES);
  }

  get intercambioDeReposiciones() {
    return intercambioDe(this.http, RUTA_DE_REPOSICIONES);
  }

  get intercambioSinDocumento() {
    return intercambioDe(this.http, RUTA_SIN_DOCUMENTO);
  }

  get intercambioDeEstado() {
    return intercambioDe(this.http, RUTA_DE_ESTADO);
  }

  get intercambioDeArqueos() {
    return intercambioDe(this.http, RUTA_DE_ARQUEOS);
  }

  pendientes(consulta: Consulta) {
    return this.http.obtener<ReporteDePendientes>(RUTA_DE_PENDIENTES, consulta);
  }

  reposiciones(consulta: Consulta) {
    return this.http.obtener<ReporteDeReposiciones>(RUTA_DE_REPOSICIONES, consulta);
  }

  sinDocumento(consulta: Consulta) {
    return this.http.obtener<ReporteSinDocumento>(RUTA_SIN_DOCUMENTO, consulta);
  }

  estadoDeFondos(consulta: Consulta) {
    return this.http.obtener<ReporteDeEstadoDeFondos>(RUTA_DE_ESTADO, consulta);
  }

  arqueos(consulta: Consulta) {
    return this.http.obtener<ReporteDeArqueos>(RUTA_DE_ARQUEOS, consulta);
  }
}

export const apiReportesDeCajaChica = new ApiReportesDeCajaChica(clienteHttp);
