import { computed, onMounted, ref, watch, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { apiSat2237, type RespuestaDelSat2237 } from '../../servicios/sat-2237.api';
import { opcionesDePeriodoDelLibro, periodoAnterior } from '../libro/datos-del-libro';
import { usarDescargas } from '../libro/usar-salidas-del-libro';

/** Pide los datos del período; si llegan dos respuestas, solo vale la de la última petición. */
function usarCargaDelPeriodo(periodo: Ref<string>) {
  const avisos = usarAvisos();
  const datos = ref<RespuestaDelSat2237 | null>(null);
  const cargando = ref(false);
  let ultima = 0;

  async function cargar(): Promise<void> {
    const peticion = ++ultima;
    cargando.value = true;
    try {
      const respuesta = await apiSat2237.obtener(periodo.value);
      if (peticion === ultima) datos.value = respuesta;
    } catch (error) {
      if (peticion !== ultima) return;
      datos.value = null;
      avisos.error(error instanceof Error ? error.message : 'No se pudieron cargar los datos del SAT-2237.');
    }
    if (peticion === ultima) cargando.value = false;
  }
  watch(periodo, () => void cargar());
  onMounted(cargar);
  return { datos, cargando };
}

/** Los datos del SAT-2237 del período escogido (el mes anterior al abrir) y su Excel. */
export function usarSat2237() {
  const { descargando, descargar } = usarDescargas();
  const periodo = ref(periodoAnterior(new Date()));
  return {
    periodo,
    ...usarCargaDelPeriodo(periodo),
    descargando,
    opcionesDePeriodo: computed(() => opcionesDePeriodoDelLibro(new Date(), periodo.value)),
    exportar: () => descargar(() => apiSat2237.exportar(periodo.value)),
  };
}
