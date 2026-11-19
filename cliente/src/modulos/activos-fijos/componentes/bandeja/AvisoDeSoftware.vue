<script setup lang="ts">
import { Info } from 'lucide-vue-next';
import { AVISO_DE_SOFTWARE } from '../../composables/bandeja/textos-de-bandeja';

/** Recordatorio de qué software se capitaliza y qué se descarta (V-2); va arriba de la bandeja. */
</script>

<template>
  <aside
    class="mb-4 flex gap-3 rounded-2xl bg-trigo-300/25 p-4 text-sm text-tierra-800 ring-1 ring-trigo-500/40 dark:bg-trigo-500/10 dark:text-tierra-100"
    aria-label="Software y suscripciones"
  >
    <Info class="mt-0.5 size-5 shrink-0 text-trigo-500" aria-hidden="true" />
    <div class="min-w-0">
      <p class="font-medium">{{ AVISO_DE_SOFTWARE.titulo }}</p>
      <ul class="mt-1 list-disc space-y-0.5 pl-5 text-tierra-700 dark:text-tierra-300">
        <li v-for="linea in AVISO_DE_SOFTWARE.lineas" :key="linea">{{ linea }}</li>
      </ul>
    </div>
  </aside>
</template>
