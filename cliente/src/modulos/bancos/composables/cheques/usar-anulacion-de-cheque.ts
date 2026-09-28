import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiCheques, type Cheque } from '../../servicios/cheques.api';

/** Anula un cheque (disponible o emitido) en su propia ventana; no se puede deshacer. */
export function usarAnulacionDeCheque(alAnular: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const registro = ref<Cheque | null>(null);
  const motivo = ref('');

  function abrir(chequeAAnular: Cheque): void {
    registro.value = chequeAAnular;
    motivo.value = '';
    errores.value = {};
  }

  function cerrar(): void {
    registro.value = null;
  }

  async function confirmar(): Promise<void> {
    const cheque = registro.value;
    if (!cheque) return;
    if (!(await enviar(() => apiCheques.anular(cheque.id, motivo.value)))) return;
    avisos.exito('Cheque anulado.');
    cerrar();
    await alAnular();
  }

  return { registro, motivo, enviando, errores, abrir, cerrar, confirmar };
}
