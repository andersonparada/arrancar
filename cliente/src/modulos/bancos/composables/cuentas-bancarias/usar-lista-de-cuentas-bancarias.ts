import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { apiCuentasBancarias, type CuentaBancaria } from '../../servicios/cuentas-bancarias.api';

/** Las cuentas bancarias de la empresa para la lista; cada una lleva a su ficha. */
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
  return { registros, cargando, intercambio: usarIntercambio(apiCuentasBancarias.intercambio, cargar) };
}
