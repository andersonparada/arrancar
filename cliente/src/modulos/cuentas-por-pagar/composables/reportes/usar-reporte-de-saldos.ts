import { computed, onMounted, reactive } from 'vue';
import { useRoute } from 'vue-router';
import { alDejarDeEscribir } from '@/modulos/core/composables/al-dejar-de-escribir';
import { apiReportesDeCuentasPorPagar } from '../../servicios/reportes.api';
import { fechaDeHoy } from '../dinero';
import { usarProveedoresDelFiltro } from '../usar-lista-de-documentos';
import {
  cantidadDeFiltrosDeSaldos,
  consultaDeSaldos,
  avisoDeCorteFuturo,
  errorDeCorte,
  filtrosDeSaldosIniciales,
} from './filtros-de-saldos';
import { pedidoDesdeLaRuta } from './parametros-de-la-ruta';
import { usarExportacionDeReporte } from './usar-exportacion-de-reporte';
import { usarPeticionDeReporte } from './usar-peticion-de-reporte';

/** Los filtros de R1 (con lo que pide el enlace de otro reporte), cuántos se salen de lo normal y cómo quitarlos. */
function usarFiltrosDeSaldos(hoy: string) {
  const pedido = pedidoDesdeLaRuta(useRoute().query);
  const filtros = reactive(filtrosDeSaldosIniciales(hoy, pedido.proveedorId, pedido.corte));
  return {
    filtros,
    proveedores: usarProveedoresDelFiltro(),
    cantidadDeFiltros: computed(() => cantidadDeFiltrosDeSaldos(filtros, hoy)),
    avisoDelCorte: computed(() => avisoDeCorteFuturo(filtros.corte, hoy)),
    quitarFiltros: () => Object.assign(filtros, filtrosDeSaldosIniciales(hoy)),
  };
}

/** R1, saldos por proveedor: los filtros, el reporte y la descarga a Excel. */
export function usarReporteDeSaldos() {
  const { filtros, ...deLosFiltros } = usarFiltrosDeSaldos(fechaDeHoy());
  const { reporte, cargando, cargar } = usarPeticionDeReporte(
    () => apiReportesDeCuentasPorPagar.saldosPorProveedor(consultaDeSaldos(filtros)),
    'No se pudo cargar el reporte de saldos.',
  );
  const errorDelCorte = computed(() => errorDeCorte(filtros.corte, reporte.value?.fechaDeInicio ?? null));
  const cargarSiElCorteSirve = (): void => {
    if (!errorDelCorte.value) void cargar();
  };
  alDejarDeEscribir(filtros, cargarSiElCorteSirve);
  onMounted(cargarSiElCorteSirve);

  return {
    ...deLosFiltros,
    filtros,
    reporte,
    cargando,
    errorDelCorte,
    exportar: usarExportacionDeReporte(
      apiReportesDeCuentasPorPagar.intercambioDeSaldos,
      () => consultaDeSaldos(filtros),
      () => !!errorDelCorte.value,
    ),
  };
}
