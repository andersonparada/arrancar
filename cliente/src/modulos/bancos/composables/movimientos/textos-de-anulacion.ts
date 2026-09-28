import type { Movimiento } from '../../servicios/movimientos.api';

/** El título de la ventana de anular, según qué es el movimiento. */
export function tituloDeAnulacion(movimiento: Movimiento | null): string {
  if (movimiento?.transferenciaId) return 'Anular transferencia';
  if (movimiento?.chequeId) return 'Anular cheque';
  return 'Anular movimiento';
}

/** El texto de confirmación de la ventana de anular, según qué es el movimiento. */
export function textoDeAnulacion(movimiento: Movimiento | null): string {
  if (movimiento?.transferenciaId) {
    return '¿Anular esta transferencia? Se anulan sus dos notas. Esta acción no se puede deshacer.';
  }
  if (movimiento?.chequeId) {
    return `¿Anular el cheque No. ${movimiento.numeroDeCheque ?? ''}? Esta acción no se puede deshacer.`;
  }
  return `¿Anular el movimiento «${movimiento?.referencia ?? ''}»? Esta acción no se puede deshacer.`;
}
