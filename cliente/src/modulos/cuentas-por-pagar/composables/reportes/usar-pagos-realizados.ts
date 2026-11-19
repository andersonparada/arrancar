import { computed, onMounted, reactive, ref, watch, type Ref } from 'vue';
import { useRoute } from 'vue-router';
import { alDejarDeEscribir } from '@/modulos/core/composables/al-dejar-de-escribir';
import { apiReportesDeCuentasPorPagar } from '../../servicios/reportes.api';
import { fechaDeHoy } from '../dinero';
import { paginasEnTotal } from '../filtros-de-documentos';
import { usarProveedoresDelFiltro } from '../usar-lista-de-documentos';
import { pedidoDesdeLaRuta } from './parametros-de-la-ruta';
import {
  cantidadDeFiltrosDePagos,
  consultaDePagos,
  consultaParaExportarPagos,
  errorDeRangoDePagos,
  estadoDeImpresionDePagos,
  FILAS_DE_PAGOS_POR_PAGINA,
  filtrosDePagosIniciales,
  TOPE_DE_IMPRESION_DE_PAGOS,
  type FiltrosDePagos,
} from './pagos-realizados';
import { usarExportacionDeReporte } from './usar-exportacion-de-reporte';
import { usarImpresionDeFilas } from './usar-impresion-de-filas';
import { usarPeticionDeReporte } from './usar-peticion-de-reporte';

/** Los filtros, la página y el reporte que se ve en pantalla. */
function usarListadoDePagos(hoy: string) {
  const filtros = reactive(filtrosDePagosIniciales(hoy, pedidoDesdeLaRuta(useRoute().query).proveedorId));
  const pagina = ref(1);
  const { reporte, cargando, cargar } = usarPeticionDeReporte(
    () =>
      apiReportesDeCuentasPorPagar.pagosRealizados(consultaDePagos(filtros, pagina.value, FILAS_DE_PAGOS_POR_PAGINA)),
    'No se pudo cargar el reporte de pagos.',
  );
  const errorDelRango = computed(() => errorDeRangoDePagos(filtros.desde, filtros.hasta));
  const cargarSiElRangoSirve = (): void => {
    if (!errorDelRango.value) void cargar();
  };
  alDejarDeEscribir(filtros, () => (pagina.value === 1 ? cargarSiElRangoSirve() : (pagina.value = 1)));
  watch(pagina, cargarSiElRangoSirve);
  onMounted(cargarSiElRangoSirve);
  return { filtros, pagina, reporte, cargando, errorDelRango };
}

/** Lo que se hace con el reporte ya cargado: imprimir con tope, avisar del tope y exportar. */
function usarSalidasDePagos(filtros: FiltrosDePagos, total: Ref<number>, hayError: () => boolean) {
  const impresion = usarImpresionDeFilas(
    () => estadoDeImpresionDePagos(total.value),
    async () =>
      (await apiReportesDeCuentasPorPagar.pagosRealizados(consultaDePagos(filtros, 1, TOPE_DE_IMPRESION_DE_PAGOS)))
        .filas,
  );
  return {
    ...impresion,
    avisoDeImpresion: computed(() => (total.value > 0 ? estadoDeImpresionDePagos(total.value).mensaje : '')),
    exportar: usarExportacionDeReporte(
      apiReportesDeCuentasPorPagar.intercambioDePagos,
      () => consultaParaExportarPagos(filtros),
      hayError,
    ),
  };
}

/** R6, pagos realizados: filtros, páginas, Excel e impresión con tope de 2,000 filas. */
export function usarPagosRealizados() {
  const hoy = fechaDeHoy();
  const listado = usarListadoDePagos(hoy);
  const { filtros, reporte, errorDelRango } = listado;
  const total = computed(() => reporte.value?.total ?? 0);
  return {
    ...listado,
    ...usarSalidasDePagos(filtros, total, () => !!errorDelRango.value),
    proveedores: usarProveedoresDelFiltro(),
    total,
    paginas: computed(() => paginasEnTotal(total.value, FILAS_DE_PAGOS_POR_PAGINA)),
    cantidadDeFiltros: computed(() => cantidadDeFiltrosDePagos(filtros, hoy)),
    quitarFiltros: () => Object.assign(filtros, filtrosDePagosIniciales(hoy)),
  };
}
