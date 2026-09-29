import { computed, reactive, watch } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import {
  apiMovimientosPorConcepto,
  type ReporteDeMovimientosPorConcepto,
} from '../../servicios/movimientos-por-concepto.api';
import { errorDeRango } from '../comunes/rango-de-fechas';
import { filtroDeLaConsulta, filtrosPorOmision, type FiltrosPorConcepto } from './filtros-por-concepto';
import { usarDetallesPorConcepto } from './usar-detalles-por-concepto';

const REPORTE_VACIO: ReporteDeMovimientosPorConcepto = {
  desde: '',
  hasta: '',
  cuentaBancariaId: null,
  conceptos: [],
  entradas: '0.00',
  salidas: '0.00',
  neto: '0.00',
  cantidad: 0,
};

/** El reporte por concepto con sus filtros y los detalles desplegables; recarga al cambiar el filtro si el rango sirve. */
export function usarReportePorConcepto() {
  const filtros = reactive<FiltrosPorConcepto>(filtrosPorOmision());
  const errorDelRango = computed(() => errorDeRango(filtros));
  const {
    datos: reporte,
    cargando,
    cargar,
  } = usarCarga(
    () => apiMovimientosPorConcepto.reporte(filtroDeLaConsulta(filtros)),
    REPORTE_VACIO,
    'No se pudo cargar el reporte de movimientos por concepto.',
  );
  const { detalles, alternar, cerrarTodos } = usarDetallesPorConcepto(filtros);
  watch(filtros, () => {
    cerrarTodos();
    if (!errorDelRango.value) void cargar();
  });

  return { filtros, reporte, cargando, errorDelRango, detalles, alternar };
}
