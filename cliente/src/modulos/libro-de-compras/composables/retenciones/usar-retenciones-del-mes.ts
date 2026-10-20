import { computed, onMounted, reactive, ref, watch } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { apiRetenciones, type ReporteDeRetenciones } from '../../servicios/retenciones.api';
import { opcionesDePeriodoDelLibro } from '../libro/datos-del-libro';
import { usarDescargas } from '../libro/usar-salidas-del-libro';
import {
  alternarId,
  depurarSeleccion,
  filtrosIniciales,
  idsParaAnotar,
  marcadas,
  todasMarcadas,
} from './datos-de-retenciones';
import { sumarMontos } from './dinero';

/** Trae el reporte del mes con sus filtros; si llegan dos respuestas, solo vale la de la última petición. */
function usarReporte() {
  const avisos = usarAvisos();
  const filtros = reactive(filtrosIniciales(new Date()));
  const reporte = ref<ReporteDeRetenciones | null>(null);
  const cargando = ref(false);
  let ultima = 0;

  async function cargar(): Promise<void> {
    const peticion = ++ultima;
    cargando.value = true;
    try {
      const respuesta = await apiRetenciones.reporte({ ...filtros });
      if (peticion === ultima) reporte.value = respuesta;
    } catch (error) {
      if (peticion !== ultima) return;
      reporte.value = null;
      avisos.error(error instanceof Error ? error.message : 'No se pudieron cargar las retenciones.');
    }
    if (peticion === ultima) cargando.value = false;
  }

  watch(filtros, () => void cargar());
  onMounted(cargar);
  return { filtros, reporte, cargando, cargar };
}

/** Las filas marcadas para anotar constancias en lote. */
function usarSeleccion(reporte: { value: ReporteDeRetenciones | null }) {
  const ids = ref<string[]>([]);
  const retenciones = computed(() => reporte.value?.retenciones ?? []);
  const posibles = computed(() => idsParaAnotar(retenciones.value));
  watch(retenciones, (lista) => (ids.value = depurarSeleccion(ids.value, lista)));

  return {
    ids,
    posibles,
    marcadas: computed(() => marcadas(ids.value, retenciones.value)),
    total: computed(() => sumarMontos(marcadas(ids.value, retenciones.value).map((r) => r.retenido))),
    todas: computed(() => todasMarcadas(ids.value, posibles.value)),
    alternar: (id: string) => (ids.value = alternarId(ids.value, id)),
    marcarPosibles: () => (ids.value = [...posibles.value]),
    limpiar: () => (ids.value = []),
  };
}

/** El mes de retenciones: filtros, reporte, selección para constancias en lote y Excel. */
export function usarRetencionesDelMes() {
  const { filtros, reporte, cargando, cargar } = usarReporte();
  const { descargando, descargar } = usarDescargas();

  return {
    filtros,
    reporte,
    cargando,
    recargar: cargar,
    seleccion: usarSeleccion(reporte),
    descargando,
    opcionesDeMes: computed(() => opcionesDePeriodoDelLibro(new Date(), filtros.mes)),
    exportar: () => descargar(() => apiRetenciones.exportar({ ...filtros })),
  };
}
