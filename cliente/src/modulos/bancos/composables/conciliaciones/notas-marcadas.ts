import type { Movimiento } from '../../servicios/movimientos.api';
import type { Conciliacion } from '../../servicios/conciliaciones.api';

const dosDigitos = (n: number): string => String(n).padStart(2, '0');

/** El último día del mes de la conciliación (`AAAA-MM-DD`), hasta donde llegan sus candidatos. */
export function finDelMesDeConciliacion(conciliacion: Pick<Conciliacion, 'anio' | 'mes'>): string {
  const ultimo = new Date(conciliacion.anio, conciliacion.mes, 0).getDate();
  return `${conciliacion.anio}-${dosDigitos(conciliacion.mes)}-${dosDigitos(ultimo)}`;
}

type NotaConMarca = Pick<Movimiento, 'id' | 'fecha' | 'marcadaParaCuentasPorPagar' | 'puedeDesmarcar'>;

/**
 * De las notas de la cuenta, las marcadas para Cuentas por pagar que el servidor deja desmarcar y que son candidatas
 * de esta conciliación, de la más antigua a la más reciente. Si una está ligada a un pago, el servidor la rechaza al
 * desmarcar: aquí no se adivina.
 */
export function notasMarcadasDeLaConciliacion<T extends NotaConMarca>(
  notas: T[],
  candidatos: Pick<Movimiento, 'id'>[],
): T[] {
  const ids = new Set(candidatos.map((c) => c.id));
  return notas
    .filter((n) => n.marcadaParaCuentasPorPagar && n.puedeDesmarcar && ids.has(n.id))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** El resumen de la lista: cuántas hay, en singular o plural. */
export const resumenDeNotasMarcadas = (cantidad: number): string =>
  cantidad === 1
    ? 'Hay 1 nota marcada para Cuentas por pagar que todavía no se aplica.'
    : `Hay ${cantidad} notas marcadas para Cuentas por pagar que todavía no se aplican.`;
