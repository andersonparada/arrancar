import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiSaldosIniciales, type SaldoInicial } from '../../servicios/saldos-iniciales.api';
import { MAXIMO_DEL_MOTIVO } from '../../textos';
import { errorDelMotivo } from '../reglas-de-acciones';

/** Eliminar un saldo inicial: una ventana con lo que va a pasar y el motivo, que queda en la auditoría. */
export function usarEliminacionDeSaldoInicial(alEliminar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const saldo = ref<SaldoInicial | null>(null);
  const motivo = ref('');

  async function confirmar(): Promise<void> {
    const elegido = saldo.value;
    const error = errorDelMotivo(motivo.value);
    if (!elegido) return;
    if (error) return void (errores.value = { motivo: error });
    if (!(await enviar(() => apiSaldosIniciales.eliminar(elegido.id, motivo.value.trim())))) return;
    avisos.exito('Saldo inicial eliminado.');
    saldo.value = null;
    await alEliminar();
  }

  const abrir = (aEliminar: SaldoInicial): void =>
    void ([saldo.value, motivo.value, errores.value] = [aEliminar, '', {}]);
  const cerrar = (): void => void (saldo.value = null);
  return { saldo, motivo, enviando, errores, maximo: MAXIMO_DEL_MOTIVO, abrir, cerrar, confirmar };
}
