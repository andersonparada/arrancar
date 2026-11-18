import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiDteRecibidos } from '../../servicios/dte-recibidos.api';
import { enGrupos, FILAS_POR_SOLICITUD } from './datos-de-la-bandeja';

/** Lo que la ventana de descarte tiene escrito y a qué filas se aplica. */
function usarVentanaDeDescarte(limpiarErrores: () => void) {
  const abierta = ref(false);
  const motivo = ref('');
  const ids = ref<string[]>([]);

  function abrir(aDescartar: string[]): void {
    ids.value = aDescartar;
    motivo.value = '';
    limpiarErrores();
    abierta.value = true;
  }

  return { abierta, motivo, ids, abrir, cerrar: () => (abierta.value = false) };
}

/** Descarta de a 500 (el tope del servidor) y deja en `hechos` los que ya se descartaron, aunque un grupo falle. */
async function descartarPorGrupos(ids: readonly string[], motivo: string, hechos: string[]): Promise<void> {
  for (const grupo of enGrupos(ids, FILAS_POR_SOLICITUD)) {
    await apiDteRecibidos.descartar(grupo, motivo);
    hechos.push(...grupo);
  }
}

/**
 * Descartar con motivo y restaurar; sirve para la bandeja y para la conciliación. Descarta de a 500 por solicitud
 * (el tope del servidor); `alTerminar` recibe los ids ya descartados y recarga la lista.
 */
export function usarDescarteDeFilas(alTerminar: (descartados: string[]) => unknown) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const ventana = usarVentanaDeDescarte(() => (errores.value = {}));

  async function descartar(): Promise<void> {
    const motivo = ventana.motivo.value.trim();
    if (!motivo) {
      errores.value = { motivo: 'Escriba por qué no se registra; queda en el historial.' };
      return;
    }
    const cantidad = ventana.ids.value.length;
    const hechos: string[] = [];
    const todo = await enviar(() => descartarPorGrupos(ventana.ids.value, motivo, hechos));
    if (hechos.length) await alTerminar(hechos);
    if (!todo) return;
    avisos.exito(cantidad === 1 ? 'Se descartó el DTE.' : `Se descartaron ${cantidad} DTE.`);
    ventana.cerrar();
  }

  async function restaurar(id: string): Promise<void> {
    if (!(await enviar(() => apiDteRecibidos.restaurar(id)))) return;
    avisos.exito('Se restauró el DTE.');
    await alTerminar([id]);
  }

  return { ...ventana, enviando, errores, descartar, restaurar };
}
