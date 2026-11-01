<script setup lang="ts">
import type { ClaveDeResultado, ConciliacionDelPeriodo } from '../../servicios/conciliacion.api';
import { TARJETAS_DE_CONCILIACION } from '../../textos-de-la-conciliacion';

/** Una tarjeta por resultado con su conteo; tocar una abre su lista. Las que piden revisión se marcan en rojo si tienen algo. */
defineProps<{ resumen: ConciliacionDelPeriodo['resumen'] }>();
const grupo = defineModel<ClaveDeResultado>({ required: true });

const BORDES = {
  campo: 'border-campo-600',
  trigo: 'border-trigo-500',
  rojo: 'border-red-600',
  tierra: 'border-tierra-400',
};
</script>

<template>
  <ul class="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
    <li v-for="tarjeta in TARJETAS_DE_CONCILIACION" :key="tarjeta.clave">
      <button
        type="button"
        :aria-pressed="grupo === tarjeta.clave"
        class="flex h-full w-full flex-col rounded-2xl border-l-4 bg-white p-4 text-left ring-1 ring-tierra-200/70 hover:bg-tierra-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-campo-500 aria-pressed:ring-2 aria-pressed:ring-campo-500 dark:bg-tierra-800/60 dark:ring-tierra-700 dark:hover:bg-tierra-800"
        :class="resumen[tarjeta.clave] === 0 && tarjeta.porRevisar ? BORDES.campo : BORDES[tarjeta.tono]"
        @click="grupo = tarjeta.clave"
      >
        <span class="text-2xl font-semibold tabular-nums">{{ resumen[tarjeta.clave] }}</span>
        <span class="text-sm font-medium">{{ tarjeta.texto }}</span>
      </button>
    </li>
  </ul>
</template>
