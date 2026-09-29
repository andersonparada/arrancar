import type { Movimiento } from '../../servicios/movimientos.api';

type ConHistoria = Pick<Movimiento, 'anuladoEn' | 'revertidoEn' | 'revierteAId'>;

/** La marca que lleva un movimiento en las tarjetas y en el reporte; `undefined` si es uno normal. */
export type MarcaDeReversion = 'Anulado' | 'Revertido' | 'Reversión';

/**
 * Anulado es un cheque anulado a la antigua (en un mes abierto: sin inverso); revertido es el original
 * que ya tiene su inverso; reversión es el inverso mismo.
 */
export function marcaDeReversion({ anuladoEn, revertidoEn, revierteAId }: ConHistoria): MarcaDeReversion | undefined {
  if (anuladoEn) return 'Anulado';
  if (revertidoEn) return 'Revertido';
  return revierteAId ? 'Reversión' : undefined;
}

/** Lo anulado, lo revertido y los inversos ya no se corrigen: quedan como están. */
export const esDeSoloLectura = (movimiento: ConHistoria): boolean => marcaDeReversion(movimiento) !== undefined;

/** El renglón de detalle que explica la baja de un movimiento, si la tuvo. */
export function motivoDeLaBaja(
  movimiento: ConHistoria & Pick<Movimiento, 'motivoDeAnulacion' | 'motivoDeReversion'>,
): { etiqueta: string; valor: string } | null {
  if (movimiento.anuladoEn) return { etiqueta: 'Motivo de anulación', valor: movimiento.motivoDeAnulacion ?? '—' };
  if (movimiento.revertidoEn) return { etiqueta: 'Motivo de anulación', valor: movimiento.motivoDeReversion ?? '—' };
  return null;
}
