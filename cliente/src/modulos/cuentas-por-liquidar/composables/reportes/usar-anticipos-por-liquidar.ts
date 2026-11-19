import { computed, onMounted, reactive } from 'vue';
import { alDejarDeEscribir } from '@/modulos/core/composables/al-dejar-de-escribir';
import { apiReportesDeCuentasPorLiquidar } from '../../servicios/reportes.api';
import {
  cantidadDeFiltrosDeAnticipos,
  consultaDeAnticipos,
  errorDeCorteDeAnticipos,
  filtrosDeAnticiposIniciales,
} from './anticipos-por-liquidar';
import { fechaDeHoy } from './fechas-de-reportes';
import { usarExportacionDeReporte } from './usar-exportacion-de-reporte';
import { usarPeticionDeReporte } from './usar-peticion-de-reporte';

/** Los filtros y el reporte, que se pide al cambiarlos (si el corte está completo). */
function usarReporteDeAnticipos(hoy: string) {
  const filtros = reactive(filtrosDeAnticiposIniciales(hoy));
  const errorDelCorte = computed(() => errorDeCorteDeAnticipos(filtros.corte));
  const { reporte, cargando, cargar } = usarPeticionDeReporte(
    () => apiReportesDeCuentasPorLiquidar.anticiposPorLiquidar(consultaDeAnticipos(filtros)),
    'No se pudo cargar el reporte de anticipos por liquidar.',
  );
  const cargarSiElCorteSirve = (): void => {
    if (!errorDelCorte.value) void cargar();
  };
  alDejarDeEscribir(filtros, cargarSiElCorteSirve);
  onMounted(cargarSiElCorteSirve);
  return { filtros, reporte, cargando, errorDelCorte };
}

/** CL-R1, anticipos por liquidar al corte: filtros, reporte y Excel. */
export function usarAnticiposPorLiquidar() {
  const hoy = fechaDeHoy();
  const { filtros, errorDelCorte, ...datos } = usarReporteDeAnticipos(hoy);
  return {
    ...datos,
    filtros,
    errorDelCorte,
    cantidadDeFiltros: computed(() => cantidadDeFiltrosDeAnticipos(filtros, hoy)),
    quitarFiltros: () => Object.assign(filtros, filtrosDeAnticiposIniciales(hoy)),
    exportar: usarExportacionDeReporte(
      apiReportesDeCuentasPorLiquidar.intercambioDeAnticipos,
      () => consultaDeAnticipos(filtros),
      () => !!errorDelCorte.value,
    ),
  };
}
