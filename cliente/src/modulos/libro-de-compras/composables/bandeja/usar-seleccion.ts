import { computed, ref } from 'vue';

/** Lo marcado en una lista, que se conserva al cambiar de página. */
export function usarSeleccion() {
  const marcadas = ref<Set<string>>(new Set());

  const modificar = (cambio: (copia: Set<string>) => void): void => {
    const copia = new Set(marcadas.value);
    cambio(copia);
    marcadas.value = copia;
  };

  return {
    marcadas,
    cantidad: computed(() => marcadas.value.size),
    estaMarcada: (id: string) => marcadas.value.has(id),
    alternar: (id: string) => modificar((copia) => (copia.delete(id) ? undefined : copia.add(id))),
    marcar: (ids: readonly string[]) => modificar((copia) => ids.forEach((id) => copia.add(id))),
    quitar: (ids: readonly string[]) => modificar((copia) => ids.forEach((id) => copia.delete(id))),
    limpiar: () => (marcadas.value = new Set()),
  };
}
