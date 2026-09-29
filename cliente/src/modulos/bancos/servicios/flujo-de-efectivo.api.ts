import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';

export type ActividadDelFlujo = 'operacion' | 'inversion' | 'financiamiento';

/** Una línea del flujo: lo que entró y salió por esa clase de cobro o pago (un inverso resta en la de su original). */
export interface LineaDeFlujo {
  etiqueta: string;
  entradas: string;
  salidas: string;
  neto: string;
  cantidad: number;
}

export interface ActividadDeFlujo {
  actividad: ActividadDelFlujo;
  lineas: LineaDeFlujo[];
  entradas: string;
  salidas: string;
  neto: string;
}

/** Las líneas que no son de una actividad pero hacen falta para que el período cuadre. */
export interface LineaAparte extends LineaDeFlujo {
  clave: 'transferencias' | 'sin_actividad' | 'sin_clasificar';
}

/** saldo al inicio + saldos iniciales del rango + flujo neto = saldo al final en libros. */
export interface ControlDeCuadre {
  saldoAlInicio: string;
  saldosInicialesDelRango: string;
  flujoNeto: string;
  saldoCalculado: string;
  saldoAlFinal: string;
  diferencia: string;
  cuadra: boolean;
}

export interface ReporteDeFlujoDeEfectivo {
  desde: string;
  hasta: string;
  cuentaBancariaId: string | null;
  actividades: ActividadDeFlujo[];
  lineasAparte: LineaAparte[];
  control: ControlDeCuadre;
}

/** Lo que se manda al servidor: el rango es obligatorio; sin cuenta son todas las de la empresa. */
export interface FiltroDelFlujo {
  desde: string;
  hasta: string;
  cuentaBancariaId?: string;
  [clave: string]: string | undefined;
}

const RUTA = '/bancos/flujo-de-efectivo';

/** El flujo de efectivo es de solo lectura: el reporte y su Excel. */
export class ApiFlujoDeEfectivo {
  constructor(private readonly http: ClienteHttp) {}

  /** Solo exportar (es reporte), con el mismo filtro que la pantalla. */
  get intercambio() {
    return intercambioDe(this.http, RUTA);
  }

  reporte(filtro: FiltroDelFlujo) {
    return this.http.obtener<ReporteDeFlujoDeEfectivo>(RUTA, filtro);
  }
}

export const apiFlujoDeEfectivo = new ApiFlujoDeEfectivo(clienteHttp);
