import { computed, ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiDepreciacion, type RevisionDelCierre } from '../../servicios/depreciacion.api';
import { nombreDelMes } from './logica-de-cierre';

/** Pide la revisión de un mes al servidor; si falla, avisa y cierra la ventana (`periodo` vuelve a `null`). */
function usarPedidoDeRevision(periodo: Ref<string | null>) {
  const avisos = usarAvisos();
  const revision = ref<RevisionDelCierre | null>(null);
  const revisando = ref(false);

  async function revisar(mes: string): Promise<void> {
    revisando.value = true;
    try {
      revision.value = await apiDepreciacion.revisar(mes);
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo revisar el mes.');
      periodo.value = null;
    } finally {
      revisando.value = false;
    }
  }

  return { revision, revisando, revisar };
}

/**
 * Revisar un mes antes de cerrarlo: se pide la revisión al servidor, se muestran los hallazgos y los totales, y solo
 * se cierra si el servidor dice que se puede. Si al cerrar algo cambió, se vuelve a revisar para mostrar lo nuevo.
 */
export function usarRevisionDeCierre(alCerrar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, enviar } = usarFormulario();
  const periodo = ref<string | null>(null);
  const { revision, revisando, revisar } = usarPedidoDeRevision(periodo);
  const titulo = computed(() => (periodo.value ? `Cerrar ${nombreDelMes(periodo.value)}` : ''));

  async function abrir(mes: string): Promise<void> {
    revision.value = null;
    periodo.value = mes;
    await revisar(mes);
  }

  async function cerrar(): Promise<void> {
    const actual = revision.value;
    if (!actual?.puedeCerrar) return;
    if (!(await enviar(() => apiDepreciacion.cerrar(actual.periodo, actual.huella)))) {
      await revisar(actual.periodo);
      return;
    }
    periodo.value = null;
    avisos.exito(`${nombreDelMes(actual.periodo)} quedó cerrado.`);
    await alCerrar();
  }

  return { periodo, revision, revisando, enviando, titulo, abrir, cerrar, descartar: () => (periodo.value = null) };
}
