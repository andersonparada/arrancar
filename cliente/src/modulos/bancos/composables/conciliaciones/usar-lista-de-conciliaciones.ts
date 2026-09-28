import { type Ref, watch } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiConciliaciones, type ConciliacionResumen } from '../../servicios/conciliaciones.api';

/** Las conciliaciones de la cuenta elegida; recarga cada vez que cambia la cuenta. */
export function usarListaDeConciliaciones(cuentaBancariaId: Ref<string | null>) {
  const {
    datos: conciliaciones,
    cargando,
    cargar,
  } = usarCarga(
    () => (cuentaBancariaId.value ? apiConciliaciones.listarDeLaCuenta(cuentaBancariaId.value) : Promise.resolve([])),
    [] as ConciliacionResumen[],
    'No se pudieron cargar las conciliaciones.',
  );
  watch(cuentaBancariaId, cargar);
  return { conciliaciones, cargando, cargar };
}
