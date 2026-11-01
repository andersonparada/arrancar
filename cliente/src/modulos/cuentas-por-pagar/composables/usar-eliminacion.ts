import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiCuentasPorPagar } from '../servicios/cuentas-por-pagar.api';
import { mensajeDeEliminacion } from './reglas-de-acciones';
import type { FichaActual } from './usar-acciones-con-ventana';

/** Eliminar un documento (error de captura) con una confirmación que dice qué se pierde; `alEliminar` sale de la ficha. */
export function usarEliminacion(ficha: FichaActual, alEliminar: () => void) {
  const avisos = usarAvisos();
  const { enviando, enviar } = usarFormulario();

  async function eliminar(): Promise<void> {
    if (!ficha.value) return;
    const { id } = ficha.value;
    const confirmado = await avisos.confirmar({
      titulo: 'Eliminar documento',
      mensaje: mensajeDeEliminacion(ficha.value),
      textoConfirmar: 'Eliminar',
      peligroso: true,
    });
    if (!confirmado || !(await enviar(() => apiCuentasPorPagar.eliminar(id)))) return;
    avisos.exito('Documento eliminado.');
    alEliminar();
  }

  return { enviando, eliminar };
}
