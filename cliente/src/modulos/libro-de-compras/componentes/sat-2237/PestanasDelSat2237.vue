<script setup lang="ts">
import { VENTANA_DEL_SAT_2237 as textos } from '../../textos-del-sat-2237';

/** Dos vistas de los mismos datos: por rubros o como en el formulario. Las flechas pasan de una a otra. */
const comoEnElFormulario = defineModel<boolean>({ required: true });
const pestanas = [
  { valor: false, texto: textos.porRubros, id: 'pestana-por-rubros' },
  { valor: true, texto: textos.comoEnElFormulario, id: 'pestana-como-en-el-formulario' },
];

function alPulsarFlecha(evento: KeyboardEvent): void {
  if (evento.key !== 'ArrowLeft' && evento.key !== 'ArrowRight') return;
  comoEnElFormulario.value = !comoEnElFormulario.value;
  document.getElementById(pestanas[Number(comoEnElFormulario.value)]!.id)?.focus();
}
</script>

<template>
  <div
    role="tablist"
    :aria-label="textos.vistas"
    class="mb-4 flex gap-1 overflow-x-auto border-b border-tierra-200 dark:border-tierra-700"
  >
    <button
      v-for="pestana in pestanas"
      :id="pestana.id"
      :key="pestana.id"
      type="button"
      role="tab"
      :aria-selected="comoEnElFormulario === pestana.valor"
      :tabindex="comoEnElFormulario === pestana.valor ? 0 : -1"
      class="-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium"
      :class="
        comoEnElFormulario === pestana.valor
          ? 'border-campo-700 text-campo-800 dark:border-campo-400 dark:text-campo-300'
          : 'border-transparent text-tierra-600 hover:text-tierra-900 dark:text-tierra-300 dark:hover:text-white'
      "
      @click="comoEnElFormulario = pestana.valor"
      @keydown="alPulsarFlecha"
    >
      {{ pestana.texto }}
    </button>
  </div>
</template>
