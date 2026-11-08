import { nextTick, ref, watch, type Ref } from 'vue';

/** Un problema nuevo se lleva a la vista: el usuario puede estar en el fondo de un formulario largo. */
export function usarProblemaALaVista(problema: Ref<unknown>) {
  const zona = ref<HTMLElement | null>(null);
  watch(problema, async (nuevo) => {
    if (!nuevo) return;
    await nextTick();
    zona.value?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
  return zona;
}
