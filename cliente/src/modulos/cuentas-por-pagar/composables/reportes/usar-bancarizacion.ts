import { computed, onMounted, reactive } from 'vue';
import { useRoute } from 'vue-router';
import { alDejarDeEscribir } from '@/modulos/core/composables/al-dejar-de-escribir';
import { apiReportesDeCuentasPorPagar } from '../../servicios/reportes.api';
import { fechaDeHoy } from '../dinero';
import { usarProveedoresDelFiltro } from '../usar-lista-de-documentos';
import {
  cantidadDeFiltrosDeBancarizacion,
  consultaDeBancarizacion,
  errorDelRangoDeBancarizacion,
  filtrosDeBancarizacionIniciales,
  opcionesDeMesesDeBancarizacion,
} from './bancarizacion';
import { pedidoDesdeLaRuta } from './parametros-de-la-ruta';
import { usarExportacionDeReporte } from './usar-exportacion-de-reporte';
import { usarPeticionDeReporte } from './usar-peticion-de-reporte';

/** Los filtros (con el proveedor que pida el enlace de otro reporte) y el reporte, que se pide al cambiarlos. */
function usarReporteDeBancarizacion(hoy: string) {
  const filtros = reactive(filtrosDeBancarizacionIniciales(hoy, pedidoDesdeLaRuta(useRoute().query).proveedorId));
  const errorDelRango = computed(() => errorDelRangoDeBancarizacion(filtros));
  const { reporte, cargando, cargar } = usarPeticionDeReporte(
    () => apiReportesDeCuentasPorPagar.bancarizacion(consultaDeBancarizacion(filtros)),
    'No se pudo cargar el reporte de pagos en efectivo.',
  );
  const cargarSiElRangoSirve = (): void => {
    if (!errorDelRango.value) void cargar();
  };
  alDejarDeEscribir(filtros, cargarSiElRangoSirve);
  onMounted(cargarSiElRangoSirve);
  return { filtros, reporte, cargando, errorDelRango };
}

/** R9, pagos en efectivo sobre el umbral de bancarización: filtros, reporte y Excel. */
export function usarBancarizacion() {
  const hoy = fechaDeHoy();
  const { filtros, errorDelRango, ...datos } = usarReporteDeBancarizacion(hoy);
  return {
    ...datos,
    filtros,
    errorDelRango,
    meses: opcionesDeMesesDeBancarizacion(hoy),
    proveedores: usarProveedoresDelFiltro(),
    cantidadDeFiltros: computed(() => cantidadDeFiltrosDeBancarizacion(filtros, hoy)),
    quitarFiltros: () => Object.assign(filtros, filtrosDeBancarizacionIniciales(hoy)),
    exportar: usarExportacionDeReporte(
      apiReportesDeCuentasPorPagar.intercambioDeBancarizacion,
      () => consultaDeBancarizacion(filtros),
      () => !!errorDelRango.value,
    ),
  };
}
