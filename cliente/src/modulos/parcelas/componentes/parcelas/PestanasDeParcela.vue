<script setup lang="ts">
import { pestanaTrasLaTecla } from '../../composables/parcelas/navegacion-por-pestanas';

/** Las pestañas de la ficha de la parcela; las flechas, Inicio y Fin pasan de una a otra. */
const actual = defineModel<string>({ required: true });
const props = defineProps<{ pestanas: readonly { clave: string; texto: string }[] }>();
const idDe = (clave: string): string => `pestana-de-parcela-${clave}`;

function alPulsarUnaTecla(evento: KeyboardEvent): void {
  const destino = pestanaTrasLaTecla(
    props.pestanas.map(({ clave }) => clave),
    actual.value,
    evento.key,
  );
  if (!destino) return;
  evento.preventDefault();
  actual.value = destino;
  document.getElementById(idDe(destino))?.focus();
}
</script>

<template>
  <div
    role="tablist"
    aria-label="Secciones de la parcela"
    class="flex gap-1 overflow-x-auto border-b border-tierra-200 dark:border-tierra-700"
  >
    <button
      v-for="pestana in pestanas"
      :id="idDe(pestana.clave)"
      :key="pestana.clave"
      type="button"
      role="tab"
      :aria-selected="actual === pestana.clave"
      aria-controls="panel-de-la-parcela"
      :tabindex="actual === pestana.clave ? 0 : -1"
      class="-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium"
      :class="
        actual === pestana.clave
          ? 'border-campo-700 text-campo-800 dark:border-campo-400 dark:text-campo-300'
          : 'border-transparent text-tierra-600 hover:text-tierra-900 dark:text-tierra-300 dark:hover:text-white'
      "
      @click="actual = pestana.clave"
      @keydown="alPulsarUnaTecla"
    >
      {{ pestana.texto }}
    </button>
  </div>
</template>
