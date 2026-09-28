import { computed, ref, watch, type Ref } from 'vue';
import type { Conciliacion, MovimientoConMarca } from '../../servicios/conciliaciones.api';
import { conAlternado, idsMarcados } from './marcas';

/** El estado local de qué movimientos están marcados, antes de guardarlo en el servidor. */
export function usarMarcadoDeMovimientos(conciliacion: Ref<Conciliacion | null>) {
  const marcados = ref<Set<string>>(new Set());

  watch(
    conciliacion,
    (actual) => {
      if (actual) marcados.value = idsMarcados(actual.movimientos);
    },
    { immediate: true },
  );

  const movimientosConMarca = computed<MovimientoConMarca[]>(() =>
    (conciliacion.value?.movimientos ?? []).map((m) => ({ ...m, marcado: marcados.value.has(m.id) })),
  );

  function alternar(movimientoId: string): void {
    if (!conciliacion.value?.cerrada) marcados.value = conAlternado(marcados.value, movimientoId);
  }

  return { marcados, movimientosConMarca, alternar };
}
