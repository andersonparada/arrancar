<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next';

/** Los avisos del libro: no bloquean nada, pero conviene leerlos antes de declarar. */
defineProps<{ avisos: string[] }>();
</script>

<template>
  <section
    v-if="avisos.length"
    class="mb-4 rounded-2xl bg-trigo-300/40 p-4 text-sm text-tierra-900 dark:bg-trigo-500/20 dark:text-trigo-300"
    role="status"
    aria-label="Avisos del libro"
  >
    <p class="flex items-center gap-2 font-semibold">
      <TriangleAlert class="size-4 shrink-0" aria-hidden="true" /> Revise antes de declarar:
    </p>
    <ul class="mt-2 list-disc space-y-1.5 pl-6">
      <li v-for="aviso in avisos" :key="aviso">{{ aviso }}</li>
    </ul>
  </section>
</template>
