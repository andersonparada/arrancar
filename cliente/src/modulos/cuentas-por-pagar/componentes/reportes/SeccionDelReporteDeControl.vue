<script setup lang="ts">
import { useId } from 'vue';

/** Una sección de R8: su título con cuántas filas trae y, si no hay, lo dice en vez de dejar un hueco. */
defineProps<{ titulo: string; cantidad: number; descripcion?: string }>();
const id = useId();
</script>

<template>
  <section :aria-labelledby="id" class="space-y-2 print:break-inside-avoid-page">
    <div>
      <h2 :id="id" class="text-base font-semibold">
        {{ titulo }} <span class="font-normal text-tierra-500 dark:text-tierra-300">({{ cantidad }})</span>
      </h2>
      <p v-if="descripcion" class="text-xs text-tierra-600 dark:text-tierra-300">{{ descripcion }}</p>
    </div>
    <p
      v-if="cantidad === 0"
      class="rounded-xl bg-tierra-50 px-3 py-2 text-sm text-tierra-600 dark:bg-tierra-800/60 dark:text-tierra-300"
    >
      Nada que revisar en esta sección este mes.
    </p>
    <div
      v-else
      class="overflow-x-auto rounded-2xl bg-white ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700 print:overflow-visible print:ring-0"
    >
      <slot />
    </div>
  </section>
</template>
