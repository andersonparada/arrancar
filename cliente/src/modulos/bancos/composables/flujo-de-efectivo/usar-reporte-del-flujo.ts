import { computed, reactive, watch } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiFlujoDeEfectivo, type ReporteDeFlujoDeEfectivo } from '../../servicios/flujo-de-efectivo.api';
import { errorDeRango } from '../comunes/rango-de-fechas';
import { filtroDeLaConsulta, filtrosPorOmision, type FiltrosDelFlujo } from './filtros-del-flujo';

const CONTROL_VACIO = {
  saldoAlInicio: '0.00',
  saldosInicialesDelRango: '0.00',
  flujoNeto: '0.00',
  saldoCalculado: '0.00',
  saldoAlFinal: '0.00',
  diferencia: '0.00',
  cuadra: true,
};

const REPORTE_VACIO: ReporteDeFlujoDeEfectivo = {
  desde: '',
  hasta: '',
  cuentaBancariaId: null,
  actividades: [],
  lineasAparte: [],
  control: CONTROL_VACIO,
};

/** El flujo de efectivo con sus filtros; recarga solo al cambiar el filtro, si el rango sirve. */
export function usarReporteDelFlujo() {
  const filtros = reactive<FiltrosDelFlujo>(filtrosPorOmision());
  const errorDelRango = computed(() => errorDeRango(filtros));
  const {
    datos: reporte,
    cargando,
    cargar,
  } = usarCarga(
    () => apiFlujoDeEfectivo.reporte(filtroDeLaConsulta(filtros)),
    REPORTE_VACIO,
    'No se pudo cargar el flujo de efectivo.',
  );
  watch(filtros, () => {
    if (!errorDelRango.value) void cargar();
  });

  return { filtros, reporte, cargando, errorDelRango };
}
