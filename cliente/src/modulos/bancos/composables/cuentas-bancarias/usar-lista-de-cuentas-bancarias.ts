import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { apiCuentasBancarias, type CuentaBancaria } from '../../servicios/cuentas-bancarias.api';
import { apiSaldosIniciales } from '../../servicios/saldos-iniciales.api';

/**
 * Las cuentas bancarias de la empresa para la lista; cada una lleva a su
 * ficha. Además de su propio Excel, importa y exporta los saldos iniciales
 * (así recarga la lista, porque cambia el saldo de las cuentas).
 */
export function usarListaDeCuentasBancarias() {
  const {
    datos: registros,
    cargando,
    cargar,
  } = usarCarga(
    () => apiCuentasBancarias.listar(),
    [] as CuentaBancaria[],
    'No se pudieron cargar las cuentas bancarias.',
  );
  return {
    registros,
    cargando,
    intercambio: usarIntercambio(apiCuentasBancarias.intercambio, cargar),
    intercambioDeSaldosIniciales: usarIntercambio(apiSaldosIniciales.intercambio, cargar),
  };
}
