import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';

/** Lo que sumó un concepto en el rango; un inverso resta en el concepto de su original. */
export interface ConceptoDelReporte {
  conceptoId: string;
  conceptoNombre: string;
  esDeSistema: boolean;
  entradas: string;
  salidas: string;
  neto: string;
  /** Movimientos originales del rango. */
  cantidad: number;
  /** Inversos (anulaciones) del rango. */
  cantidadDeInversos: number;
}

export interface ReporteDeMovimientosPorConcepto {
  desde: string;
  hasta: string;
  cuentaBancariaId: string | null;
  conceptos: ConceptoDelReporte[];
  entradas: string;
  salidas: string;
  neto: string;
  cantidad: number;
}

/** El rango es obligatorio; `conceptoIds` va separado por comas y, sin él, son todos los conceptos. */
export interface FiltroPorConcepto {
  desde: string;
  hasta: string;
  cuentaBancariaId?: string;
  conceptoIds?: string;
  [clave: string]: string | undefined;
}

const RUTA = '/bancos/movimientos-por-concepto';

/** Movimientos por concepto es de solo lectura: el reporte y su Excel. */
export class ApiMovimientosPorConcepto {
  constructor(private readonly http: ClienteHttp) {}

  /** Solo exportar (es reporte), con el mismo filtro que la pantalla. */
  get intercambio() {
    return intercambioDe(this.http, RUTA);
  }

  reporte(filtro: FiltroPorConcepto) {
    return this.http.obtener<ReporteDeMovimientosPorConcepto>(RUTA, filtro);
  }
}

export const apiMovimientosPorConcepto = new ApiMovimientosPorConcepto(clienteHttp);
