import { computed, onMounted, reactive } from 'vue';
import { useRoute } from 'vue-router';
import { alDejarDeEscribir } from '@/modulos/core/composables/al-dejar-de-escribir';
import { apiReportesDeCuentasPorPagar } from '../../servicios/reportes.api';
import { fechaDeHoy } from '../dinero';
import { pedidoDesdeLaRuta } from './parametros-de-la-ruta';
import {
  cantidadDeFiltrosDeRetiros,
  consultaDeRetiros,
  errorDeCorteDeRetiros,
  filtrosDeRetirosIniciales,
} from './retiros-por-liquidar';
import { usarExportacionDeReporte } from './usar-exportacion-de-reporte';
import { usarPeticionDeReporte } from './usar-peticion-de-reporte';

/** Los filtros (con el corte que pida el enlace de otro reporte) y el reporte, que se pide al cambiarlos. */
function usarReporteDeRetiros(hoy: string) {
  const filtros = reactive(filtrosDeRetirosIniciales(hoy, pedidoDesdeLaRuta(useRoute().query).corte));
  const errorDelCorte = computed(() => errorDeCorteDeRetiros(filtros.corte));
  const { reporte, cargando, cargar } = usarPeticionDeReporte(
    () => apiReportesDeCuentasPorPagar.retirosPorLiquidar(consultaDeRetiros(filtros)),
    'No se pudo cargar el reporte de retiros por liquidar.',
  );
  const cargarSiElCorteSirve = (): void => {
    if (!errorDelCorte.value) void cargar();
  };
  alDejarDeEscribir(filtros, cargarSiElCorteSirve);
  onMounted(cargarSiElCorteSirve);
  return { filtros, reporte, cargando, errorDelCorte };
}

/** R10, retiros de efectivo por liquidar: filtros, reporte y Excel. */
export function usarRetirosPorLiquidar() {
  const hoy = fechaDeHoy();
  const { filtros, errorDelCorte, ...datos } = usarReporteDeRetiros(hoy);
  return {
    ...datos,
    filtros,
    errorDelCorte,
    cantidadDeFiltros: computed(() => cantidadDeFiltrosDeRetiros(filtros, hoy)),
    quitarFiltros: () => Object.assign(filtros, filtrosDeRetirosIniciales(hoy)),
    exportar: usarExportacionDeReporte(
      apiReportesDeCuentasPorPagar.intercambioDeRetiros,
      () => consultaDeRetiros(filtros),
      () => !!errorDelCorte.value,
    ),
  };
}
