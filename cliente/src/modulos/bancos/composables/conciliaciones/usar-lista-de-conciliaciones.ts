import { computed, type Ref, watch } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiConciliaciones, type ListaDeConciliaciones } from '../../servicios/conciliaciones.api';

const VACIA: ListaDeConciliaciones = { conciliaciones: [], periodoSiguiente: null };

/** Las conciliaciones de la cuenta elegida y el periodo que propone el servidor; recarga al cambiar la cuenta. */
export function usarListaDeConciliaciones(cuentaBancariaId: Ref<string | null>) {
  const { datos, cargando, cargar } = usarCarga(
    () =>
      cuentaBancariaId.value ? apiConciliaciones.listarDeLaCuenta(cuentaBancariaId.value) : Promise.resolve(VACIA),
    VACIA,
    'No se pudieron cargar las conciliaciones.',
  );
  watch(cuentaBancariaId, cargar);
  const conciliaciones = computed(() => datos.value.conciliaciones);
  const periodoSiguiente = computed(() => datos.value.periodoSiguiente);
  return { conciliaciones, periodoSiguiente, cargando, cargar };
}
