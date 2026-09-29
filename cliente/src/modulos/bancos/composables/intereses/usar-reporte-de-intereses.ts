import { computed, reactive, watch } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiIntereses, type ReporteDeIntereses } from '../../servicios/intereses.api';
import { errorDeRango, rangoDelAnioActual } from '../comunes/rango-de-fechas';
import { filtroDeLaConsulta, type FiltrosDelFlujo } from '../flujo-de-efectivo/filtros-del-flujo';

const REPORTE_VACIO: ReporteDeIntereses = {
  desde: '',
  hasta: '',
  cuentaBancariaId: null,
  totalDeNotas: 0,
  interesBruto: '0.00',
  isrRetenido: '0.00',
  neto: '0.00',
  notasSinDatos: 0,
  porCuenta: [],
  intereses: [],
};

/**
 * Intereses y retenciones con sus filtros (cuenta y rango de fechas, los mismos del flujo de efectivo); recarga solo
 * al cambiar el filtro, si el rango sirve. Al abrir propone el año en curso, que es lo que pide la declaración.
 */
export function usarReporteDeIntereses() {
  const filtros = reactive<FiltrosDelFlujo>({ cuentaBancariaId: null, ...rangoDelAnioActual() });
  const errorDelRango = computed(() => errorDeRango(filtros));
  const {
    datos: reporte,
    cargando,
    cargar,
  } = usarCarga(
    () => apiIntereses.reporte(filtroDeLaConsulta(filtros)),
    REPORTE_VACIO,
    'No se pudo cargar el reporte de intereses.',
  );
  watch(filtros, () => {
    if (!errorDelRango.value) void cargar();
  });

  return { filtros, reporte, cargando, errorDelRango };
}
