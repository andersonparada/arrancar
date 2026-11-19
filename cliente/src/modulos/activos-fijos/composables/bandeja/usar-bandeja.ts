import { computed, reactive, ref, watch, type Ref } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiBandeja, type Bandeja, type LineaDeBandeja } from '../../servicios/bandeja.api';
import {
  agruparPorDocumento,
  consultaDeBandeja,
  filtrarPorTexto,
  filtrosDeBandejaVacios,
  hayFiltrosEscritos,
  totalPendiente,
  type GrupoDeDocumento,
} from './lineas-de-bandeja';
import { alternarDocumento, alternarLinea, lineasElegidas, podarSeleccion } from './seleccion-de-lineas';

const VACIA: Bandeja = { umbral: null, lineas: [] };

/** Las líneas elegidas para capitalizar: se pueden elegir de varios documentos y se podan al recargar. */
function usarSeleccionDeLineas(lineas: Ref<LineaDeBandeja[]>, visibles: Ref<LineaDeBandeja[]>) {
  const seleccion = ref<string[]>([]);
  const elegidas = computed(() => lineasElegidas(lineas.value, seleccion.value));
  const totalElegido = computed(() => totalPendiente(elegidas.value));
  watch(lineas, (vigentes) => (seleccion.value = podarSeleccion(seleccion.value, vigentes)));
  return {
    seleccion,
    elegidas,
    totalElegido,
    alternar: (lineaId: string) => (seleccion.value = alternarLinea(seleccion.value, lineaId)),
    alternarDocumento: (grupo: GrupoDeDocumento) => (seleccion.value = alternarDocumento(seleccion.value, grupo)),
    elegirTodas: () => (seleccion.value = visibles.value.map((linea) => linea.lineaId)),
    limpiar: () => (seleccion.value = []),
  };
}

/**
 * La bandeja «Por capitalizar»: las líneas del libro con costo pendiente, sus filtros, la búsqueda y la selección
 * de líneas para capitalizar varias a la vez.
 */
export function usarBandeja() {
  const filtros = ref(filtrosDeBandejaVacios());
  const texto = ref('');
  const { datos, cargando, cargar } = usarCarga(
    () => apiBandeja.obtener(consultaDeBandeja(filtros.value)),
    VACIA,
    'No se pudo cargar la bandeja.',
  );
  const lineas = computed(() => datos.value.lineas);
  const visibles = computed(() => filtrarPorTexto(lineas.value, texto.value));
  const grupos = computed(() => agruparPorDocumento(visibles.value));
  const hayFiltros = computed(() => hayFiltrosEscritos(filtros.value, texto.value));
  watch(filtros, cargar, { deep: true });
  const seleccion = usarSeleccionDeLineas(lineas, visibles);
  return reactive({ datos, cargando, cargar, filtros, texto, grupos, visibles, hayFiltros, ...seleccion });
}
