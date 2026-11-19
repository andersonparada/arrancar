import { ExistenciaNegativa } from './errores.js';
import { ordenarKardex, sumaExistencia } from './orden.js';
import type { PosicionEnKardex } from './tipos.js';

/** Un movimiento de cantidad en una línea del tiempo propia (bodega y lote), sin costo. */
export interface MovimientoDeCantidad extends PosicionEnKardex {
  readonly id: string;
  /** Identifica la línea del tiempo, por ejemplo `bodegaId|loteId`. */
  readonly clave: string;
  readonly cantidad: bigint;
}

/**
 * Suma acumulada de cantidades por clave en el orden del kardex (§7.3): una salida con fecha anterior a la
 * entrada de **su** bodega se rechaza aunque otra bodega tuviera existencia. Los de tipo `valor` se ignoran.
 */
export function verificarCantidadesPorClave(movimientos: readonly MovimientoDeCantidad[]): void {
  const saldos = new Map<string, bigint>();
  for (const m of ordenarKardex(movimientos)) {
    if (m.tipo === 'valor') continue;
    const actual = saldos.get(m.clave) ?? 0n;
    const nuevo = sumaExistencia(m.tipo) ? actual + m.cantidad : actual - m.cantidad;
    if (nuevo < 0n) throw new ExistenciaNegativa(m.fecha, -nuevo, m.id);
    saldos.set(m.clave, nuevo);
  }
}
