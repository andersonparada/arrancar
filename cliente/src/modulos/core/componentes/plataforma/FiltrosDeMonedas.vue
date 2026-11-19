<script setup lang="ts">
import type { FiltrosDeMonedas } from '../../composables/plataforma/lista-de-monedas';

defineProps<{ mostradas: number; total: number }>();
const filtros = defineModel<FiltrosDeMonedas>({ required: true });
</script>

<template>
  <fieldset class="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
    <legend class="sr-only">Filtros de la lista</legend>
    <label class="flex items-center gap-2 text-sm">
      <input v-model="filtros.conCodigo" type="checkbox" class="size-4 accent-campo-700" />
      Con código del Banguat
    </label>
    <label class="flex items-center gap-2 text-sm">
      <input v-model="filtros.activas" type="checkbox" class="size-4 accent-campo-700" />
      Activas
    </label>
    <p class="text-sm text-tierra-600 dark:text-tierra-300" aria-live="polite">
      {{ mostradas }} de {{ total }} monedas
    </p>
  </fieldset>
</template>
