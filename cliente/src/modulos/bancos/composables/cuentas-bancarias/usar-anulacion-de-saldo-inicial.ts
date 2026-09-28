import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiSaldosIniciales } from '../../servicios/saldos-iniciales.api';
import type { Movimiento } from '../../servicios/movimientos.api';

/** Anula el saldo inicial con un motivo, en su propia ventana; no se puede deshacer. */
export function usarAnulacionDeSaldoInicial(alAnular: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const registro = ref<Movimiento | null>(null);
  const motivo = ref('');

  function abrir(vigente: Movimiento): void {
    registro.value = vigente;
    motivo.value = '';
    errores.value = {};
  }

  function cerrar(): void {
    registro.value = null;
  }

  async function confirmar(): Promise<void> {
    const saldoInicial = registro.value;
    if (!saldoInicial) return;
    if (!(await enviar(() => apiSaldosIniciales.anular(saldoInicial.id, motivo.value)))) return;
    avisos.exito('Saldo inicial anulado.');
    cerrar();
    await alAnular();
  }

  return { registro, motivo, enviando, errores, abrir, cerrar, confirmar };
}
