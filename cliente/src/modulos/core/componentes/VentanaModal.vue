<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { X } from 'lucide-vue-next';

const props = defineProps<{ abierta: boolean; titulo: string; ancha?: boolean }>();
const emit = defineEmits<{ cerrar: [] }>();
const contenido = ref<HTMLElement | null>(null);

function alPresionarTecla(evento: KeyboardEvent): void {
  if (evento.key === 'Escape') emit('cerrar');
}

watch(
  () => props.abierta,
  async (abierta) => {
    document.body.style.overflow = abierta ? 'hidden' : '';
    if (abierta) {
      document.addEventListener('keydown', alPresionarTecla);
      await nextTick();
      contenido.value?.querySelector<HTMLElement>('input:not([type=hidden]), select, textarea, button')?.focus();
    } else {
      document.removeEventListener('keydown', alPresionarTecla);
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  document.body.style.overflow = '';
  document.removeEventListener('keydown', alPresionarTecla);
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
      enter-active-class="transition-opacity duration-150"
      leave-active-class="transition-opacity duration-150"
    >
      <div v-if="abierta" class="fixed inset-0 z-40 flex items-end justify-center bg-tierra-900/50 sm:items-center sm:p-4" @click.self="emit('cerrar')">
        <section
          role="dialog"
          aria-modal="true"
          :aria-label="titulo"
          class="flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl dark:bg-tierra-900 dark:ring-1 dark:ring-tierra-700"
          :class="ancha ? 'sm:max-w-3xl' : 'sm:max-w-lg'"
        >
          <header class="flex items-center justify-between border-b border-tierra-100 px-5 py-4 dark:border-tierra-800">
            <h2 class="text-lg font-semibold">{{ titulo }}</h2>
            <button type="button" class="rounded-lg p-1.5 text-tierra-500 hover:bg-tierra-100 dark:hover:bg-tierra-800" aria-label="Cerrar" @click="emit('cerrar')">
              <X class="size-5" />
            </button>
          </header>
          <div ref="contenido" class="overflow-y-auto px-5 py-4">
            <slot />
          </div>
          <footer v-if="$slots.pie" class="flex flex-col-reverse gap-2 border-t border-tierra-100 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end dark:border-tierra-800">
            <slot name="pie" />
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
