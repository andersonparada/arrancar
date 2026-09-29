import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';

/** Una nota de intereses: lo que dijo el banco (bruto e ISR retenido) y lo que acreditó (neto). */
export interface InteresDelReporte {
  movimientoId: string;
  fecha: string;
  cuentaBancariaId: string;
  cuentaBancariaNombre: string;
  numero: number | null;
  referencia: string | null;
  interesBruto: string;
  isrRetenido: string;
  neto: string;
}

/** Los totales de una cuenta, para cotejarlos con la constancia de retención que da el banco. */
export interface InteresesDeUnaCuenta {
  cuentaBancariaId: string;
  cuentaBancariaNombre: string;
  cantidad: number;
  interesBruto: string;
  isrRetenido: string;
  neto: string;
}

export interface ReporteDeIntereses {
  desde: string;
  hasta: string;
  cuentaBancariaId: string | null;
  totalDeNotas: number;
  interesBruto: string;
  isrRetenido: string;
  neto: string;
  /** Notas de un concepto de intereses sin bruto ni ISR (por ejemplo, reclasificadas): faltan en el reporte. */
  notasSinDatos: number;
  porCuenta: InteresesDeUnaCuenta[];
  intereses: InteresDelReporte[];
}

const RUTA = '/bancos/intereses-y-retenciones';

/** Intereses y retenciones es de solo lectura: el reporte y su Excel. */
export class ApiIntereses {
  constructor(private readonly http: ClienteHttp) {}

  /** Solo exportar (es reporte), con el mismo filtro que la pantalla. */
  get intercambio() {
    return intercambioDe(this.http, RUTA);
  }

  /** El rango es obligatorio; sin cuenta son todas las de la empresa. */
  reporte(filtro: { desde: string; hasta: string; cuentaBancariaId?: string }) {
    return this.http.obtener<ReporteDeIntereses>(RUTA, filtro);
  }
}

export const apiIntereses = new ApiIntereses(clienteHttp);
