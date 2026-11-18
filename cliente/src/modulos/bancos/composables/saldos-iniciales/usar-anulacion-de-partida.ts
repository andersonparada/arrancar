import { reactive, ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiSaldosIniciales } from '../../servicios/saldos-iniciales.api';
import type { PartidaDeApertura } from '../../servicios/tipos-de-saldos-iniciales';
import { fechaDeHoy } from '../comunes/baja-de-registro';
import { datosDeAnulacion } from './edicion-de-anulacion';

/** Lo que se escribe en la ventana de anular: la partida elegida, el motivo, la fecha del inverso y el pagador. */
function usarEscritoDeLaAnulacion() {
  const registro = ref<PartidaDeApertura | null>(null);
  const motivo = ref('');
  const fecha = ref('');
  const pagador = ref('');
  const abrir = (partida: PartidaDeApertura): void => {
    registro.value = partida;
    [motivo.value, pagador.value, fecha.value] = ['', '', fechaDeHoy()];
  };
  return { registro, motivo, fecha, pagador, abrir, cerrar: (): void => void (registro.value = null) };
}

/**
 * Anular una partida de apertura: pide el motivo, la fecha del movimiento inverso (después del corte) y, en el
 * depósito en tránsito, quién debe ese dinero. El servidor decide si se puede (`puedeAnular`).
 */
export function usarAnulacionDePartida(cuentaBancariaId: string, alTerminar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const escrito = usarEscritoDeLaAnulacion();

  async function confirmar(): Promise<void> {
    const { registro: partida, motivo, fecha, pagador } = escrito;
    if (!partida.value) return;
    const { movimientoId } = partida.value;
    const datos = datosDeAnulacion(partida.value, { motivo: motivo.value, fecha: fecha.value, pagador: pagador.value });
    if (!(await enviar(() => apiSaldosIniciales.anularPartida(cuentaBancariaId, movimientoId, datos)))) return;
    avisos.exito('Partida anulada.');
    escrito.cerrar();
    await alTerminar();
  }

  const abrir = (partida: PartidaDeApertura): void => {
    escrito.abrir(partida);
    errores.value = {};
  };

  return reactive({ ...escrito, abrir, enviando, errores, confirmar });
}
