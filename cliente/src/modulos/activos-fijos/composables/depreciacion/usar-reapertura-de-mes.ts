import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiDepreciacion } from '../../servicios/depreciacion.api';
import { nombreDelMes } from './logica-de-cierre';

/** Lo que se le dice a quien va a reabrir un mes: qué pasa con las cuotas y que solo se reabre de uno en uno. */
export const textoDeReapertura = (periodo: string): string =>
  `Las cuotas de ${nombreDelMes(periodo)} dejarán de contar y el mes volverá a quedar por cerrar. ` +
  'Para reabrir un mes anterior hay que reabrir primero este.';

/** Reabrir el último mes cerrado, con su motivo (queda en la auditoría). */
export function usarReaperturaDeMes(alReabrir: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const periodo = ref<string | null>(null);
  const motivo = ref('');

  function pedir(mes: string): void {
    motivo.value = '';
    errores.value = {};
    periodo.value = mes;
  }

  async function confirmar(): Promise<void> {
    const mes = periodo.value;
    if (!mes) return;
    if (!(await enviar(() => apiDepreciacion.reabrir(mes, motivo.value.trim())))) return;
    periodo.value = null;
    avisos.exito(`${nombreDelMes(mes)} quedó reabierto.`);
    await alReabrir();
  }

  return { periodo, motivo, errores, enviando, pedir, confirmar, cerrar: () => (periodo.value = null) };
}
