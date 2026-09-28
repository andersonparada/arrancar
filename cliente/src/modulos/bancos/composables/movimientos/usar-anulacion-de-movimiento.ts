import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiCheques } from '../../servicios/cheques.api';
import { apiMovimientos, type Movimiento } from '../../servicios/movimientos.api';
import { apiTransferencias } from '../../servicios/transferencias.api';

/** Anula un movimiento con un motivo; una nota de transferencia anula la transferencia y un cheque, el cheque. */
function anular(movimiento: Movimiento, motivo: string) {
  if (movimiento.transferenciaId) return apiTransferencias.anular(movimiento.transferenciaId, motivo);
  if (movimiento.chequeId) return apiCheques.anular(movimiento.chequeId, motivo);
  return apiMovimientos.anular(movimiento.id, motivo);
}

function mensajeDeExito(movimiento: Movimiento): string {
  if (movimiento.transferenciaId) return 'Transferencia anulada.';
  if (movimiento.chequeId) return 'Cheque anulado.';
  return 'Movimiento anulado.';
}

/** Anula un movimiento (o su transferencia, o su cheque) en su propia ventana; no se puede deshacer. */
export function usarAnulacionDeMovimiento(alAnular: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const registro = ref<Movimiento | null>(null);
  const motivo = ref('');

  function abrir(movimientoAAnular: Movimiento): void {
    registro.value = movimientoAAnular;
    motivo.value = '';
    errores.value = {};
  }

  function cerrar(): void {
    registro.value = null;
  }

  async function confirmar(): Promise<void> {
    const movimiento = registro.value;
    if (!movimiento) return;
    if (!(await enviar(() => anular(movimiento, motivo.value)))) return;
    avisos.exito(mensajeDeExito(movimiento));
    cerrar();
    await alAnular();
  }

  return { registro, motivo, enviando, errores, abrir, cerrar, confirmar };
}
