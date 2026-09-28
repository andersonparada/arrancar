import { computed } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { opcionesDeRegistros } from '@/modulos/core/utilidades/edicion';
import { apiCuentasBancarias, type CuentaBancaria } from '../../servicios/cuentas-bancarias.api';

/**
 * Las cuentas bancarias para elegir: en un formulario (`campos`, obligatoria) y
 * en el filtro de una lista (`filtroDeCuenta`, con "Todas"), a partir de la
 * misma carga. La usan notas, transferencias, cheques, chequeras y el reporte.
 */
export function usarReferenciasDeCuenta() {
  const { datos: cuentasBancarias } = usarCarga(
    () => apiCuentasBancarias.listar(),
    [] as CuentaBancaria[],
    'No se pudieron cargar las cuentas bancarias.',
  );
  const campos = computed(() => ({
    cuentaBancariaId: opcionesDeRegistros(
      cuentasBancarias.value,
      (cuentaBancaria) => String(cuentaBancaria.nombre),
      true,
    ),
  }));
  const filtroDeCuenta = computed(() => [
    { valor: null, texto: 'Todas' },
    ...cuentasBancarias.value.map((cuentaBancaria) => ({ valor: cuentaBancaria.id, texto: cuentaBancaria.nombre })),
  ]);
  return { campos, filtroDeCuenta, cuentasBancarias };
}
