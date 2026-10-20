import { computed, onMounted, reactive, ref, watch } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import {
  apiAnalisis,
  type ClaveDeAnalisis,
  type ConsultaDeAnalisis,
  type ResultadosDelAnalisis,
} from '../../servicios/analisis.api';
import { usarDescargas } from '../libro/usar-salidas-del-libro';
import { consultaDe, opcionesDeMes, problemaDelRango, rangoPorOmision } from './datos-del-analisis';

interface Traido {
  respuesta?: ResultadosDelAnalisis[ClaveDeAnalisis];
  fallo?: string;
}

async function traer(clave: ClaveDeAnalisis, pedido: ConsultaDeAnalisis): Promise<Traido> {
  try {
    return { respuesta: await apiAnalisis.obtener(clave, pedido) };
  } catch (error) {
    return { fallo: error instanceof Error ? error.message : 'No se pudo cargar el análisis.' };
  }
}

/** Trae el análisis escogido y guarda lo ya traído mientras no cambie el rango; solo vale la última petición. */
function usarResultados(analisis: { value: ClaveDeAnalisis }, consulta: () => ConsultaDeAnalisis | null) {
  const avisos = usarAvisos();
  const resultados = ref<Partial<ResultadosDelAnalisis>>({});
  const cargando = ref(false);
  let ultima = 0;

  async function cargar(): Promise<void> {
    const clave = analisis.value;
    const pedido = consulta();
    if (!pedido || resultados.value[clave]) return;
    const peticion = ++ultima;
    cargando.value = true;
    const { respuesta, fallo } = await traer(clave, pedido);
    if (peticion !== ultima) return;
    if (respuesta) resultados.value = { ...resultados.value, [clave]: respuesta };
    if (fallo) avisos.error(fallo);
    cargando.value = false;
  }
  const olvidar = () => {
    ++ultima;
    resultados.value = {};
    cargando.value = false;
  };
  return { resultados, cargando, cargar, olvidar };
}

/** Rango, análisis escogido y casilla de «fuera del libro», con lo que se le pide al servidor. */
function usarPregunta() {
  const rango = reactive(rangoPorOmision(new Date()));
  const analisis = ref<ClaveDeAnalisis>('compras-por-proveedor');
  const incluirFuera = ref(false);
  const problema = computed(() => problemaDelRango(rango));
  const consulta = () => (problema.value ? null : consultaDe(analisis.value, rango, incluirFuera.value));
  return { rango, analisis, incluirFuera, problema, consulta };
}

/** Análisis de compras: rango, análisis escogido, casilla de «fuera del libro», resultados y Excel. */
export function usarAnalisis() {
  const { rango, analisis, incluirFuera, problema, consulta } = usarPregunta();
  const { resultados, cargando, cargar, olvidar } = usarResultados(analisis, consulta);
  const { descargando, descargar } = usarDescargas();

  watch([() => rango.desde, () => rango.hasta, incluirFuera], () => {
    olvidar();
    void cargar();
  });
  watch(analisis, () => void cargar());
  onMounted(cargar);

  const hoy = new Date();
  return {
    ...{ rango, analisis, incluirFuera, problema, resultados, cargando, descargando },
    opcionesDeDesde: computed(() => opcionesDeMes(hoy, rango.desde)),
    opcionesDeHasta: computed(() => opcionesDeMes(hoy, rango.hasta)),
    exportar: () => {
      const pedido = consulta();
      if (pedido) void descargar(() => apiAnalisis.exportar(analisis.value, pedido));
    },
  };
}
