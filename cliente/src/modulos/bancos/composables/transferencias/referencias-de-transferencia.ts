import { computed, type Ref } from 'vue';
import { opcionesDeRegistros } from '@/modulos/core/utilidades/edicion';
import type { CuentaBancaria } from '../../servicios/cuentas-bancarias.api';

/**
 * Las cuentas para elegir origen y destino: el destino nunca ofrece la que ya se
 * eligió como origen, así no se puede transferir una cuenta a sí misma.
 */
export function usarReferenciasDeTransferencia(
  cuentasBancarias: Ref<CuentaBancaria[]>,
  origenElegido: Ref<string | null>,
) {
  const nombre = (cuentaBancaria: CuentaBancaria) => cuentaBancaria.nombre;
  return computed(() => ({
    cuentaOrigenId: opcionesDeRegistros(cuentasBancarias.value, nombre, true),
    cuentaDestinoId: opcionesDeRegistros(
      cuentasBancarias.value.filter((cuentaBancaria) => cuentaBancaria.id !== origenElegido.value),
      nombre,
      true,
    ),
  }));
}
