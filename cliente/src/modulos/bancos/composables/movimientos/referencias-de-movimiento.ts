import { computed } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { opcionesDeRegistros } from '@/modulos/core/utilidades/edicion';
import { apiCuentasBancarias, type CuentaBancaria } from '../../servicios/cuentas-bancarias.api';

/** Lo que se puede elegir en los selectores de la ventana del movimiento. */
export function usarReferenciasDeMovimiento() {
  const { datos: cuentasBancarias } = usarCarga(
    () => apiCuentasBancarias.listar(),
    [] as CuentaBancaria[],
    'No se pudieron cargar las cuentas bancarias.',
  );
  return computed(() => ({
    cuentaBancariaId: opcionesDeRegistros(
      cuentasBancarias.value,
      (cuentaBancaria) => String(cuentaBancaria.nombre),
      true,
    ),
  }));
}
