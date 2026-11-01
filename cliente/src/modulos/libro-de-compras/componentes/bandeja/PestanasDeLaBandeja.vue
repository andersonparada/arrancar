<script setup lang="ts">
import { pestanaTrasLaTecla } from '../../composables/bandeja/navegacion-por-pestanas';
import { CONCILIACION } from '../../textos-de-la-conciliacion';
import { PESTANA_DE_CONCILIACION, PESTANAS_DE_LA_BANDEJA, type ClaveDePestana } from '../../textos-de-la-bandeja';

/** Las pestañas de la pantalla: un estado de la bandeja cada una, y la conciliación. Las flechas pasan de una a otra. */
const actual = defineModel<ClaveDePestana>({ required: true });
const pestanas = [
  ...PESTANAS_DE_LA_BANDEJA.map(({ clave, texto }) => ({ clave: clave as ClaveDePestana, texto })),
  { clave: PESTANA_DE_CONCILIACION as ClaveDePestana, texto: CONCILIACION.pestana },
];
const claves = pestanas.map(({ clave }) => clave);
const idDe = (clave: string): string => `pestana-${clave}`;

function alPulsarUnaTecla(evento: KeyboardEvent): void {
  const destino = pestanaTrasLaTecla(claves, actual.value, evento.key);
  if (!destino) return;
  evento.preventDefault();
  actual.value = destino;
  document.getElementById(idDe(destino))?.focus();
}
</script>

<template>
  <div
    role="tablist"
    aria-label="Secciones de DTE de la SAT"
    class="mb-4 flex gap-1 overflow-x-auto border-b border-tierra-200 dark:border-tierra-700"
  >
    <button
      v-for="pestana in pestanas"
      :id="idDe(pestana.clave)"
      :key="pestana.clave"
      type="button"
      role="tab"
      :aria-selected="actual === pestana.clave"
      :aria-controls="'panel-de-la-bandeja'"
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
