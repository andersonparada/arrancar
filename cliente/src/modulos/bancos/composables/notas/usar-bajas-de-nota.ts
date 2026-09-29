import { apiNotas } from '../../servicios/notas.api';
import type { Movimiento } from '../../servicios/movimientos.api';
import { usarBajaDeRegistro } from '../comunes/usar-baja-de-registro';

/**
 * Las dos bajas de una nota: anular (crea su movimiento inverso, con la fecha que se escriba) y
 * eliminar (solo si está limpia). La tarjeta muestra cada botón solo si el servidor dice que se puede.
 */
export function usarBajasDeNota(alTerminar: () => Promise<void>) {
  const anulacion = usarBajaDeRegistro<Movimiento>({
    ejecutar: (nota, datos) => apiNotas.anular(nota.id, datos),
    aviso: 'Nota anulada: se creó su movimiento inverso.',
    alTerminar,
  });
  const eliminacion = usarBajaDeRegistro<Movimiento>({
    ejecutar: (nota, { motivo }) => apiNotas.eliminar(nota.id, motivo),
    aviso: 'Nota eliminada.',
    alTerminar,
  });
  return { anulacion, eliminacion };
}
