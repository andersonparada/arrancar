import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiConciliaciones } from '../../servicios/conciliaciones.api';

/** Elimina una conciliación (solo la última de su cuenta) en su propia ventana; pide el motivo y no se puede deshacer. */
export function usarEliminacionDeConciliacion(alEliminar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const conciliacionId = ref<string | null>(null);
  const motivo = ref('');

  function abrir(idAEliminar: string): void {
    conciliacionId.value = idAEliminar;
    motivo.value = '';
    errores.value = {};
  }

  function cerrar(): void {
    conciliacionId.value = null;
  }

  async function confirmar(): Promise<void> {
    const id = conciliacionId.value;
    if (!id) return;
    if (!(await enviar(() => apiConciliaciones.eliminar(id, motivo.value)))) return;
    avisos.exito('Conciliación eliminada: el mes vuelve a estar abierto.');
    cerrar();
    await alEliminar();
  }

  return { conciliacionId, motivo, enviando, errores, abrir, cerrar, confirmar };
}
