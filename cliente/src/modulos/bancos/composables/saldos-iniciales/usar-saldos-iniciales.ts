import { computed } from 'vue';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiSaldosIniciales } from '../../servicios/saldos-iniciales.api';
import type { SaldosIniciales } from '../../servicios/tipos-de-saldos-iniciales';
import { ordenarCuentasPorNombre, permisosDeIntercambio, sePuedeCargar } from './detalles-de-saldos-iniciales';

/** La pantalla «Saldos iniciales»: todas las cuentas con su cuadre, los totales, los hallazgos y los dos Excel. */
export function usarSaldosIniciales() {
  const {
    datos: saldos,
    cargando,
    cargar,
  } = usarCarga(
    () => apiSaldosIniciales.listar(),
    null as SaldosIniciales | null,
    'No se pudieron cargar los saldos iniciales.',
  );
  const cuentas = computed(() => ordenarCuentasPorNombre(saldos.value?.cuentas ?? []));
  return {
    saldos,
    cuentas,
    cargando,
    puedeCargar: computed(() => sePuedeCargar(saldos.value)),
    permisosDelExcel: computed(() => permisosDeIntercambio(sePuedeCargar(saldos.value))),
    intercambio: usarIntercambio(apiSaldosIniciales.intercambio, cargar),
    intercambioDePartidas: usarIntercambio(apiSaldosIniciales.intercambioDePartidas, cargar),
  };
}
