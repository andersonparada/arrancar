import { computed, ref, watch, type Ref } from 'vue';
import type { Conciliacion, MovimientoConMarca } from '../../servicios/conciliaciones.api';
import { conAlternadoConPareja, idsMarcados } from './marcas';

/** El estado local de qué documentos están marcados, antes de guardarlo en el servidor; solo se edita en proceso. */
export function usarMarcadoDeMovimientos(conciliacion: Ref<Conciliacion | null>) {
  const marcados = ref<Set<string>>(new Set());
  const todos = computed(() => [
    ...(conciliacion.value?.candidatos ?? []),
    ...(conciliacion.value?.posfechadosCandidatos ?? []),
  ]);

  watch(
    conciliacion,
    (actual) => {
      if (actual) marcados.value = idsMarcados(todos.value);
    },
    { immediate: true },
  );

  const conMarca = (lista: MovimientoConMarca[] | undefined): MovimientoConMarca[] =>
    (lista ?? []).map((m) => ({ ...m, marcado: marcados.value.has(m.id) }));
  const candidatosConMarca = computed(() => conMarca(conciliacion.value?.candidatos));
  const posfechadosConMarca = computed(() => conMarca(conciliacion.value?.posfechadosCandidatos));

  function alternar(movimientoId: string): void {
    if (conciliacion.value?.estado === 'en_proceso')
      marcados.value = conAlternadoConPareja(marcados.value, movimientoId, todos.value);
  }

  return { marcados, candidatosConMarca, posfechadosConMarca, alternar };
}
