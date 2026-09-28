import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiCheques, type ChequeListado } from '../../servicios/cheques.api';

/** Anula un cheque emitido desde la lista de la empresa; no se puede deshacer. */
export function usarAnulacionDeChequeListado(alAnular: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const registro = ref<ChequeListado | null>(null);
  const motivo = ref('');

  function abrir(chequeAAnular: ChequeListado): void {
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
