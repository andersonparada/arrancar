import { computed } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiCuentasBancarias, type CuentaBancaria } from '../../servicios/cuentas-bancarias.api';

/** Las cuentas bancarias para elegir en la pantalla de conciliaciones. */
export function usarOpcionesDeCuenta() {
  const { datos: cuentasBancarias, cargando } = usarCarga(
    () => apiCuentasBancarias.listar(),
    [] as CuentaBancaria[],
    'No se pudieron cargar las cuentas bancarias.',
  );
  const opciones = computed(() =>
    cuentasBancarias.value.map((cuentaBancaria) => ({ valor: cuentaBancaria.id, texto: cuentaBancaria.nombre })),
  );
  return { cuentasBancarias, opciones, cargando };
}
