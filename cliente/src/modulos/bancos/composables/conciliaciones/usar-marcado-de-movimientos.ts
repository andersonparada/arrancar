import { computed, ref, watch, type Ref } from 'vue';
import type { Conciliacion, MovimientoConMarca } from '../../servicios/conciliaciones.api';
import { conAlternadoConPareja, idsMarcados } from './marcas';

/** El estado local de qué documentos están marcados, antes de guardarlo en el servidor; solo se edita en proceso. */
export function usarMarcadoDeMovimientos(conciliacion: Ref<Conciliacion | null>) {
  const marcados = ref<Set<string>>(new Set());

  watch(
    conciliacion,
    (actual) => {
      if (actual) marcados.value = idsMarcados(actual.candidatos);
    },
    { immediate: true },
  );

  const candidatosConMarca = computed<MovimientoConMarca[]>(() =>
    (conciliacion.value?.candidatos ?? []).map((m) => ({ ...m, marcado: marcados.value.has(m.id) })),
  );

  function alternar(movimientoId: string): void {
    if (conciliacion.value?.estado === 'en_proceso')
      marcados.value = conAlternadoConPareja(marcados.value, movimientoId, conciliacion.value.candidatos);
  }

  return { marcados, candidatosConMarca, alternar };
}
