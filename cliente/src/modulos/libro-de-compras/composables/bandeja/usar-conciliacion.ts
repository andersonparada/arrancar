import { computed, onMounted, ref, watch, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { apiConciliacion, type ClaveDeResultado, type ConciliacionDelPeriodo } from '../../servicios/conciliacion.api';
import { periodoAnterior } from '../libro/datos-del-libro';
import { cantidadConciliada, cantidadPorRevisar, grupoInicial } from './datos-de-la-conciliacion';
import { usarDescarteDeFilas } from './usar-descarte-de-filas';

/** Calcula la conciliación del período; si llegan dos respuestas, solo vale la de la última petición. */
function usarCalculoDeConciliacion(periodo: Ref<string>) {
  const avisos = usarAvisos();
  const conciliacion = ref<ConciliacionDelPeriodo | null>(null);
  const grupo = ref<ClaveDeResultado>('cuadra');
  const cargando = ref(true);
  let ultimaPeticion = 0;

  async function cargar(): Promise<void> {
    const peticion = ++ultimaPeticion;
    cargando.value = true;
    try {
      const respuesta = await apiConciliacion.obtener(periodo.value);
      if (peticion !== ultimaPeticion) return;
      conciliacion.value = respuesta;
      grupo.value = grupoInicial(respuesta);
    } catch (error) {
      if (peticion !== ultimaPeticion) return;
      conciliacion.value = null;
      avisos.error(error instanceof Error ? error.message : 'No se pudo calcular la conciliación.');
    }
    cargando.value = false;
  }

  return { conciliacion, grupo, cargando, cargar };
}

/** La conciliación de un mes: se calcula al escoger el período y el grupo abierto es el primero que pide revisión. */
export function usarConciliacion() {
  const periodo = ref(periodoAnterior(new Date()));
  const calculo = usarCalculoDeConciliacion(periodo);
  const { conciliacion } = calculo;

  watch(periodo, calculo.cargar);
  onMounted(calculo.cargar);

  return {
    ...calculo,
    periodo,
    descarte: usarDescarteDeFilas(calculo.cargar),
    porRevisar: computed(() => (conciliacion.value ? cantidadPorRevisar(conciliacion.value) : 0)),
    hayAlgo: computed(() => (conciliacion.value ? cantidadConciliada(conciliacion.value) > 0 : false)),
  };
}
