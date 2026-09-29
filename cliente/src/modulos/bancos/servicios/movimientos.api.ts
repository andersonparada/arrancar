import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';

/** Movimiento tal como lo manda el servidor: una nota, un saldo inicial o un cheque. */
export interface Movimiento {
  id: string;
  cuentaBancariaId: string;
  tipo: 'credito' | 'debito' | 'cheque';
  fecha: string;
  monto: string;
  saldoInicial: boolean;
  referencia: string | null;
  beneficiario: string | null;
  observaciones: string | null;
  cuentaBancariaNombre: string | null;
  anuladoEn: string | null;
  motivoDeAnulacion: string | null;
  /** La transferencia que lo creó, si es una de sus dos notas; si no, `null`. */
  transferenciaId: string | null;
  /** El cheque que lo creó, si es tipo `cheque`; si no, `null`. */
  chequeId: string | null;
  numeroDeCheque: number | null;
  /** La conciliación donde quedó marcado; si no, `null`. */
  conciliacionId: string | null;
  /** Cuándo se revirtió (se le creó su inverso); `null` si nunca se revirtió. */
  revertidoEn: string | null;
  motivoDeReversion: string | null;
  /** El movimiento original que revierte, si este es un inverso; si no, `null`. */
  revierteAId: string | null;
  /** Lo calcula el servidor: si se puede anular (crear su inverso). */
  puedeAnular: boolean;
  /** Lo calcula el servidor: si se puede eliminar de verdad (está limpio). */
  puedeEliminar: boolean;
}

/** Una fila del reporte, con su saldo corrido (`null` si el reporte no eligió una cuenta). */
export type FilaDelReporte = Movimiento & { saldo: string | null };

export interface ReporteDeMovimientos {
  saldoAnterior: string | null;
  filas: FilaDelReporte[];
  saldoFinal: string | null;
}

/** Qué movimientos consultar: de una cuenta y entre dos fechas (incluidas); lo que falte no filtra. */
export interface FiltroDeMovimientos {
  cuentaBancariaId?: string;
  desde?: string;
  hasta?: string;
  [clave: string]: string | undefined;
}

const RUTA = '/bancos/movimientos';

/** Movimientos queda de solo lectura: el reporte (con su saldo corrido) y una nota o un saldo inicial por id. */
export class ApiMovimientos {
  constructor(private readonly http: ClienteHttp) {}

  /** Solo exportar (es reporte); lo registrado se captura en Notas, Transferencias y el saldo inicial de la cuenta. */
  get intercambio() {
    return intercambioDe(this.http, RUTA);
  }

  reporte(filtro: FiltroDeMovimientos = {}) {
    return this.http.obtener<ReporteDeMovimientos>(`${RUTA}/reporte`, filtro);
  }

  obtener(id: string) {
    return this.http.obtener<Movimiento>(`${RUTA}/${id}`);
  }
}

export const apiMovimientos = new ApiMovimientos(clienteHttp);
