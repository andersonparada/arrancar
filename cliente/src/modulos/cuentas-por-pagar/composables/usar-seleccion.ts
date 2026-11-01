import { computed, ref, watch, type Ref } from 'vue';
import {
  alternarSeleccion,
  avisoDeLote,
  conservarSeleccion,
  estaTodoSeleccionado,
  seleccionarTodos,
} from './seleccion-de-documentos';

/** Qué documentos están marcados entre los `ids` que se pueden escoger; si estos cambian, se quita lo que ya no está. */
export function usarSeleccion(ids: Ref<string[]>) {
  const seleccion = ref<string[]>([]);

  watch(ids, (disponibles) => {
    seleccion.value = conservarSeleccion(seleccion.value, disponibles);
  });

  return {
    seleccion,
    todoSeleccionado: computed(() => estaTodoSeleccionado(seleccion.value, ids.value)),
    avisoDeLote: computed(() => avisoDeLote(ids.value.length)),
    alternar: (id: string): void => {
      seleccion.value = alternarSeleccion(seleccion.value, id);
    },
    alternarTodos: (): void => {
      seleccion.value = estaTodoSeleccionado(seleccion.value, ids.value) ? [] : seleccionarTodos(ids.value);
    },
    limpiar: (): void => {
      seleccion.value = [];
    },
  };
}
