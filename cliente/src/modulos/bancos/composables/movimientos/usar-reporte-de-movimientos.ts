import { reactive, watch } from 'vue';
import { useRoute } from 'vue-router';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiMovimientos, type ReporteDeMovimientos } from '../../servicios/movimientos.api';
import { filtroDeLaConsulta, filtrosPorOmision, type FiltrosDeMovimientos } from './filtros-de-movimientos';

const REPORTE_VACIO: ReporteDeMovimientos = {
  saldoAnterior: null,
  filas: [],
  saldoFinal: null,
  sinClasificar: { cantidad: 0, montoDeEntradas: '0.00', montoDeSalidas: '0.00' },
};

/** La cuenta con la que arranca el reporte si llegó por la ruta (`?cuenta=<id>`), desde la ficha de la cuenta. */
function cuentaDeLaRuta(): string | null {
  const { cuenta } = useRoute().query;
  return typeof cuenta === 'string' ? cuenta : null;
}

/** El reporte de movimientos: filtrarlo por cuenta y fechas; recarga solo al cambiar el filtro. */
export function usarReporteDeMovimientos() {
  const filtros = reactive<FiltrosDeMovimientos>(filtrosPorOmision(cuentaDeLaRuta()));
  const {
    datos: reporte,
    cargando,
    cargar,
  } = usarCarga(
    () => apiMovimientos.reporte(filtroDeLaConsulta(filtros)),
    REPORTE_VACIO,
    'No se pudo cargar el reporte de movimientos.',
  );
  watch(filtros, cargar);

  return { filtros, reporte, cargando, cargar };
}
