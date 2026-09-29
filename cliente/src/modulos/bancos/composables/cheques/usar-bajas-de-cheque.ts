import { apiCheques } from '../../servicios/cheques.api';
import { usarBajaDeRegistro } from '../comunes/usar-baja-de-registro';

/**
 * Las dos bajas de un cheque, de cualquiera de sus listas (por eso basta su `id`): anular (si su mes ya
 * está conciliado, con una nota de crédito inversa con la fecha escrita) y blanquear (vuelve a disponible
 * y su movimiento se elimina). Los cheques no se eliminan.
 */
export function usarBajasDeCheque<Cheque extends { id: string }>(alTerminar: () => Promise<void>) {
  const anulacion = usarBajaDeRegistro<Cheque>({
    ejecutar: (cheque, datos) => apiCheques.anular(cheque.id, datos),
    aviso: 'Cheque anulado.',
    alTerminar,
  });
  const blanqueo = usarBajaDeRegistro<Cheque>({
    ejecutar: (cheque, { motivo }) => apiCheques.blanquear(cheque.id, motivo),
    aviso: 'Cheque blanqueado: vuelve a estar disponible.',
    alTerminar,
  });
  return { anulacion, blanqueo };
}
