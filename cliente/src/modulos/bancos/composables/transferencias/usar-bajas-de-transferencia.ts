import { apiTransferencias, type Transferencia } from '../../servicios/transferencias.api';
import { usarBajaDeRegistro } from '../comunes/usar-baja-de-registro';

/**
 * Las dos bajas de una transferencia: anular (crea los dos inversos, con la fecha que se escriba) y
 * eliminar (solo si sus dos notas están limpias).
 */
export function usarBajasDeTransferencia(alTerminar: () => Promise<void>) {
  const anulacion = usarBajaDeRegistro<Transferencia>({
    ejecutar: (transferencia, datos) => apiTransferencias.anular(transferencia.id, datos),
    aviso: 'Transferencia anulada: se crearon los dos movimientos inversos.',
    alTerminar,
  });
  const eliminacion = usarBajaDeRegistro<Transferencia>({
    ejecutar: (transferencia, { motivo }) => apiTransferencias.eliminar(transferencia.id, motivo),
    aviso: 'Transferencia eliminada.',
    alTerminar,
  });
  return { anulacion, eliminacion };
}
