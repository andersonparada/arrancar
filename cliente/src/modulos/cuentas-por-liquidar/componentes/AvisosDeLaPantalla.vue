<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next';

/** Los avisos que no bloquean: se leen antes de confirmar o, ya hecho, los que dijo el servidor y Bancos. */
defineProps<{ avisos: readonly string[]; titulo?: string }>();
</script>

<template>
  <section
    v-if="avisos.length > 0"
    class="rounded-xl bg-trigo-300/30 p-4 ring-1 ring-trigo-500/40 dark:bg-trigo-500/10"
    role="status"
  >
    <h3 class="mb-2 flex items-center gap-2 text-sm font-semibold text-tierra-900 dark:text-trigo-300">
      <TriangleAlert class="size-4 shrink-0" aria-hidden="true" />
      {{ titulo ?? 'Tenga en cuenta' }}
    </h3>
    <ul class="list-disc space-y-1.5 pl-5 text-sm text-tierra-800 dark:text-tierra-100">
      <li v-for="aviso in avisos" :key="aviso">{{ aviso }}</li>
    </ul>
  </section>
</template>
