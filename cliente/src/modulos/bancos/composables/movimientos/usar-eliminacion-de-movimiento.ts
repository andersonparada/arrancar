import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiMovimientos, type Movimiento } from '../../servicios/movimientos.api';

/** Eliminar un movimiento, después de confirmarlo: no se puede deshacer. */
export function usarEliminacionDeMovimiento(alEliminar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviar } = usarFormulario();

  async function eliminar(movimiento: Movimiento): Promise<void> {
    const mensaje = `¿Eliminar el movimiento "${movimiento.referencia}"? Esta acción no se puede deshacer.`;
    const confirmado = await avisos.confirmar({
      titulo: 'Eliminar movimiento',
      mensaje,
      textoConfirmar: 'Eliminar',
      peligroso: true,
    });
    if (!confirmado || !(await enviar(() => apiMovimientos.eliminar(movimiento.id)))) return;
    avisos.exito('Movimiento eliminado.');
    await alEliminar();
  }

  return { eliminar };
}
