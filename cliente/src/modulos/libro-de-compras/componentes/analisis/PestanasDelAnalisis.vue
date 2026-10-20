<script setup lang="ts">
import { analisisTrasLaTecla } from '../../composables/analisis/datos-del-analisis';
import type { ClaveDeAnalisis } from '../../servicios/analisis.api';
import { ANALISIS_DISPONIBLES } from '../../textos-del-analisis';

/** Los cinco análisis como pestañas; las flechas, Inicio y Fin cambian de una a otra. */
const analisis = defineModel<ClaveDeAnalisis>({ required: true });

const idDe = (clave: ClaveDeAnalisis) => `pestana-analisis-${clave}`;

function alPulsar(evento: KeyboardEvent): void {
  const destino = analisisTrasLaTecla(analisis.value, evento.key);
  if (!destino) return;
  evento.preventDefault();
  analisis.value = destino;
  document.getElementById(idDe(destino))?.focus();
}
</script>

<template>
  <div
    role="tablist"
    aria-label="Análisis de compras"
    class="mb-4 flex gap-1 overflow-x-auto border-b border-tierra-200 print:hidden dark:border-tierra-700"
  >
    <button
      v-for="item in ANALISIS_DISPONIBLES"
      :id="idDe(item.clave)"
      :key="item.clave"
      type="button"
      role="tab"
      :aria-selected="analisis === item.clave"
      aria-controls="panel-del-analisis"
      :tabindex="analisis === item.clave ? 0 : -1"
      class="-mb-px shrink-0 border-b-2 px-4 py-2 text-sm font-medium"
      :class="
        analisis === item.clave
          ? 'border-campo-700 text-campo-800 dark:border-campo-400 dark:text-campo-300'
          : 'border-transparent text-tierra-600 hover:text-tierra-900 dark:text-tierra-300 dark:hover:text-white'
      "
      @click="analisis = item.clave"
      @keydown="alPulsar"
    >
      {{ item.titulo }}
    </button>
  </div>
</template>
