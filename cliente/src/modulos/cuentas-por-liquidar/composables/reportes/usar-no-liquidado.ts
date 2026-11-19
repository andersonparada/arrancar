import { computed, onMounted, reactive } from 'vue';
import { alDejarDeEscribir } from '@/modulos/core/composables/al-dejar-de-escribir';
import { apiReportesDeCuentasPorLiquidar } from '../../servicios/reportes.api';
import { fechaDeHoy } from './fechas-de-reportes';
import {
  cantidadDeFiltrosDeNoLiquidado,
  consultaDeNoLiquidado,
  errorDelPeriodo,
  filtrosDeNoLiquidadoIniciales,
} from './no-liquidado';
import { usarExportacionDeReporte } from './usar-exportacion-de-reporte';
import { usarPeticionDeReporte } from './usar-peticion-de-reporte';

/** Los filtros y el reporte, que se pide al cambiarlos (si el período está completo). */
function usarReporteDeNoLiquidado(hoy: string) {
  const filtros = reactive(filtrosDeNoLiquidadoIniciales(hoy));
  const errores = computed(() => errorDelPeriodo(filtros));
  const periodoInvalido = (): boolean => !!errores.value.desde || !!errores.value.hasta;
  const { reporte, cargando, cargar } = usarPeticionDeReporte(
    () => apiReportesDeCuentasPorLiquidar.noLiquidado(consultaDeNoLiquidado(filtros)),
    'No se pudo cargar el reporte de lo no liquidado.',
  );
  const cargarSiElPeriodoSirve = (): void => {
    if (!periodoInvalido()) void cargar();
  };
  alDejarDeEscribir(filtros, cargarSiElPeriodoSirve);
  onMounted(cargarSiElPeriodoSirve);
  return { filtros, reporte, cargando, errores, periodoInvalido };
}

/** CL-R2, lo no liquidado por destino: filtros, reporte y Excel. */
export function usarNoLiquidado() {
  const hoy = fechaDeHoy();
  const { filtros, periodoInvalido, ...datos } = usarReporteDeNoLiquidado(hoy);
  return {
    ...datos,
    filtros,
    cantidadDeFiltros: computed(() => cantidadDeFiltrosDeNoLiquidado(filtros, hoy)),
    quitarFiltros: () => Object.assign(filtros, filtrosDeNoLiquidadoIniciales(hoy)),
    exportar: usarExportacionDeReporte(
      apiReportesDeCuentasPorLiquidar.intercambioDeNoLiquidado,
      () => consultaDeNoLiquidado(filtros),
      periodoInvalido,
    ),
  };
}
