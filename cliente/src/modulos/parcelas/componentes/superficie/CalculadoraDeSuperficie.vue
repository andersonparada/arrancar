<script setup lang="ts">
import { computed } from 'vue';
import { textoDeSuperficie } from '../../composables/superficie/usar-ajustes-de-superficie';
import type { VistaPreviaDeSuperficie } from '../../composables/superficie/unidades-de-superficie';

/**
 * Lo que va a guardar el servidor con la cifra que el operador escribe: los m², las hectáreas y las manzanas, en vivo.
 * Se lee solo (`aria-live`) para quien usa lector de pantalla. La útil se compara con la total para avisar antes de
 * guardar; el servidor la valida igual.
 */
const props = defineProps<{ total: VistaPreviaDeSuperficie; util: VistaPreviaDeSuperficie }>();

const lineaDe = (vista: VistaPreviaDeSuperficie): string =>
  vista.equivalencias.map(({ unidad, cifra }) => textoDeSuperficie({ unidad, cifra })).join(' · ');

const utilMayor = computed(
  () =>
    props.total.centesimas !== null && props.util.centesimas !== null && props.util.centesimas > props.total.centesimas,
);
</script>

<template>
  <div
    class="rounded-xl bg-campo-50 p-3 text-sm ring-1 ring-campo-200/70 dark:bg-campo-900/30 dark:ring-campo-800"
    aria-live="polite"
  >
    <p class="text-xs font-medium text-tierra-600 dark:text-tierra-300">Equivale a</p>
    <p v-if="total.estado === 'vacia'" class="text-tierra-600 dark:text-tierra-300">
      Escriba la superficie y aquí verá sus metros cuadrados, hectáreas y manzanas.
    </p>
    <p v-else-if="total.estado === 'error'" class="text-red-700 dark:text-red-400">{{ total.mensaje }}</p>
    <p v-else class="font-medium wrap-break-word">
      <span class="text-tierra-600 dark:text-tierra-300">Total: </span>{{ lineaDe(total) }}
    </p>
    <p v-if="util.estado === 'lista'" class="mt-1 wrap-break-word">
      <span class="text-tierra-600 dark:text-tierra-300">Útil: </span>{{ lineaDe(util) }}
    </p>
    <p v-else-if="util.estado === 'error'" class="mt-1 text-red-700 dark:text-red-400">Útil: {{ util.mensaje }}</p>
    <p v-if="utilMayor" class="mt-1 text-red-700 dark:text-red-400">
      La superficie útil no puede ser mayor que la total: corrija una de las dos cifras.
    </p>
  </div>
</template>
