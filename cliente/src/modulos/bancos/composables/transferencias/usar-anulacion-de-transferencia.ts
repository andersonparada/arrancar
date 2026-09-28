import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiTransferencias, type Transferencia } from '../../servicios/transferencias.api';

/** Anula una transferencia (y sus dos notas) con un motivo, en su propia ventana; no se puede deshacer. */
export function usarAnulacionDeTransferencia(alAnular: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const registro = ref<Transferencia | null>(null);
  const motivo = ref('');

  function abrir(transferenciaAAnular: Transferencia): void {
    registro.value = transferenciaAAnular;
    motivo.value = '';
    errores.value = {};
  }

  function cerrar(): void {
    registro.value = null;
  }

  async function confirmar(): Promise<void> {
    const transferencia = registro.value;
    if (!transferencia) return;
    if (!(await enviar(() => apiTransferencias.anular(transferencia.id, motivo.value)))) return;
    avisos.exito('Transferencia anulada.');
    cerrar();
    await alAnular();
  }

  return { registro, motivo, enviando, errores, abrir, cerrar, confirmar };
}
