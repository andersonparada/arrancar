import { clienteHttp, type ClienteHttp, type Consulta } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';
import type { ReporteDeAnticiposPorLiquidar, ReporteDeNoLiquidado } from './tipos-de-reportes';

export type * from './tipos-de-reportes';

const RUTA = '/cuentas-por-liquidar/reportes';
const RUTA_DE_ANTICIPOS = `${RUTA}/anticipos-por-liquidar`;
const RUTA_DE_NO_LIQUIDADO = `${RUTA}/no-liquidado`;

/** Los reportes de Cuentas por liquidar (solo se consultan y se exportan; no se importan). */
export class ApiReportesDeCuentasPorLiquidar {
  constructor(private readonly http: ClienteHttp) {}

  get intercambioDeAnticipos() {
    return intercambioDe(this.http, RUTA_DE_ANTICIPOS);
  }

  get intercambioDeNoLiquidado() {
    return intercambioDe(this.http, RUTA_DE_NO_LIQUIDADO);
  }

  anticiposPorLiquidar(consulta: Consulta) {
    return this.http.obtener<ReporteDeAnticiposPorLiquidar>(RUTA_DE_ANTICIPOS, consulta);
  }

  noLiquidado(consulta: Consulta) {
    return this.http.obtener<ReporteDeNoLiquidado>(RUTA_DE_NO_LIQUIDADO, consulta);
  }
}

export const apiReportesDeCuentasPorLiquidar = new ApiReportesDeCuentasPorLiquidar(clienteHttp);
