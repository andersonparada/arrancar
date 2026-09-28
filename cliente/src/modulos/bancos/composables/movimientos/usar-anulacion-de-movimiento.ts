import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiMovimientos, type Movimiento } from '../../servicios/movimientos.api';

/** Anula un movimiento con un motivo, en su propia ventana; no se puede deshacer. */
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
    if (!(await enviar(() => apiMovimientos.anular(movimiento.id, motivo.value)))) return;
    avisos.exito('Movimiento anulado.');
    cerrar();
    await alAnular();
  }

  return { registro, motivo, enviando, errores, abrir, cerrar, confirmar };
}
