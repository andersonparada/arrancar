import { computed, ref, watch, type ComputedRef } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiRecepciones, type LineaPorRecibir } from '../../servicios/recepciones.api';
import { agruparPorDocumento, filtrarLineas, lineasElegidas, type DocumentoPorRecibir } from './agrupar-lineas';
import { alternarLinea, marcarDocumento, seleccionVigente } from './seleccion-de-lineas';

/** Las líneas marcadas para recibir en lote; lo que se recibió, se descartó o se filtró deja de estar marcado. */
function usarSeleccion(visibles: ComputedRef<LineaPorRecibir[]>) {
  const seleccion = ref<string[]>([]);
  watch(visibles, (lineas) => {
    seleccion.value = seleccionVigente(
      seleccion.value,
      lineas.map((linea) => linea.lineaId),
    );
  });
  return {
    seleccion,
    elegidas: computed(() => lineasElegidas(visibles.value, seleccion.value)),
    alternar: (id: string) => (seleccion.value = alternarLinea(seleccion.value, id)),
    marcarDocumento: (documento: DocumentoPorRecibir, marcar: boolean) =>
      (seleccion.value = marcarDocumento(seleccion.value, documento, marcar)),
    limpiarSeleccion: () => (seleccion.value = []),
  };
}

/** La bandeja «Por recibir»: líneas del libro agrupadas por documento, con búsqueda y selección para recibir en lote. */
export function usarPorRecibir() {
  const {
    datos: respuesta,
    cargando,
    cargar,
  } = usarCarga(() => apiRecepciones.listar(), { lineas: [] as LineaPorRecibir[] }, 'No se pudo cargar la bandeja.');
  const busqueda = ref('');
  const visibles = computed(() => filtrarLineas(respuesta.value.lineas, busqueda.value));

  return {
    cargando,
    recargar: cargar,
    busqueda,
    documentos: computed(() => agruparPorDocumento(visibles.value)),
    hayLineas: computed(() => respuesta.value.lineas.length > 0),
    ...usarSeleccion(visibles),
  };
}
