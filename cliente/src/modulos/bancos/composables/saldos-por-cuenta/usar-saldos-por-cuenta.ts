import { computed, reactive, watch } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiSaldosPorCuenta, type ReporteDeSaldosPorCuenta } from '../../servicios/saldos-por-cuenta.api';
import { errorDeLaFecha, filtroDeLaConsulta, filtrosPorOmision, type FiltrosDeSaldos } from './filtros-de-saldos';

const SIN_TOTAL = { cantidadDeCuentas: 0, saldoEnLibros: '0.00', chequesPosfechados: '0.00', disponible: '0.00' };
const REPORTE_VACIO: ReporteDeSaldosPorCuenta = {
  fecha: '',
  cuentas: [],
  bancos: SIN_TOTAL,
  sobregiros: SIN_TOTAL,
  nota: '',
};

/** Saldos por cuenta con sus filtros; recarga solo al cambiarlos, si hay fecha de corte. */
export function usarSaldosPorCuenta() {
  const filtros = reactive<FiltrosDeSaldos>(filtrosPorOmision());
  const errorDeFecha = computed(() => errorDeLaFecha(filtros));
  const {
    datos: reporte,
    cargando,
    cargar,
  } = usarCarga(
    () => apiSaldosPorCuenta.reporte(filtroDeLaConsulta(filtros)),
    REPORTE_VACIO,
    'No se pudo cargar el reporte de saldos por cuenta.',
  );
  watch(filtros, () => {
    if (!errorDeFecha.value) void cargar();
  });
  return { filtros, reporte, cargando, errorDeFecha };
}
