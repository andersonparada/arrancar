import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiNotas } from '../../servicios/notas.api';
import type { Movimiento } from '../../servicios/movimientos.api';

/** Anula una nota con un motivo, en su propia ventana; no se puede deshacer. */
export function usarAnulacionDeNota(alAnular: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const registro = ref<Movimiento | null>(null);
  const motivo = ref('');

  function abrir(notaAAnular: Movimiento): void {
    registro.value = notaAAnular;
    motivo.value = '';
    errores.value = {};
  }

  function cerrar(): void {
    registro.value = null;
  }

  async function confirmar(): Promise<void> {
    const nota = registro.value;
    if (!nota) return;
    if (!(await enviar(() => apiNotas.anular(nota.id, motivo.value)))) return;
    avisos.exito('Nota anulada.');
    cerrar();
    await alAnular();
  }

  return { registro, motivo, enviando, errores, abrir, cerrar, confirmar };
}
