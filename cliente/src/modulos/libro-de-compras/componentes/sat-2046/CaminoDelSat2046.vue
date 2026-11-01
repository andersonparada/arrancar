<script setup lang="ts">
import type { CaminoDelSat2046 } from '../../textos-del-sat-2046';

/** Una forma de obtener el formulario, con sus pasos numerados. */
defineProps<{ camino: CaminoDelSat2046 }>();
</script>

<template>
  <section
    class="rounded-2xl bg-white p-4 ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700"
    :aria-label="camino.titulo"
  >
    <h2 class="text-lg font-semibold">{{ camino.titulo }}</h2>
    <p class="mb-3 text-sm text-tierra-600 dark:text-tierra-300">{{ camino.ayuda }}</p>
    <ol class="space-y-2">
      <li v-for="(paso, indice) in camino.pasos" :key="paso" class="flex items-start gap-3 text-sm">
        <span
          class="flex size-6 shrink-0 items-center justify-center rounded-full bg-campo-100 text-xs font-semibold text-campo-900 dark:bg-campo-900/50 dark:text-campo-100"
          aria-hidden="true"
        >
          {{ indice + 1 }}
        </span>
        <span class="min-w-0 pt-0.5">{{ paso }}</span>
      </li>
    </ol>
  </section>
</template>
