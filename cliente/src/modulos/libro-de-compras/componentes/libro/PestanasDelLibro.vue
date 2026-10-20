<script setup lang="ts">
import { VENTANA_DEL_LIBRO as textos } from '../../textos-del-libro';

/** Dos pestañas: el libro y el anexo de anulados. `true` es el anexo. Flechas izquierda y derecha cambian de una a otra. */
const anulados = defineModel<boolean>({ required: true });
const pestanas = [
  { anulados: false, texto: textos.libro, id: 'pestana-libro' },
  { anulados: true, texto: textos.anulados, id: 'pestana-anulados' },
];

function alPulsarFlecha(evento: KeyboardEvent): void {
  if (evento.key !== 'ArrowLeft' && evento.key !== 'ArrowRight') return;
  anulados.value = !anulados.value;
  document.getElementById(anulados.value ? 'pestana-anulados' : 'pestana-libro')?.focus();
}
</script>

<template>
  <div
    role="tablist"
    aria-label="Secciones del libro"
    class="mb-4 flex gap-1 border-b border-tierra-200 dark:border-tierra-700"
  >
    <button
      v-for="pestana in pestanas"
      :id="pestana.id"
      :key="pestana.id"
      type="button"
      role="tab"
      :aria-selected="anulados === pestana.anulados"
      :tabindex="anulados === pestana.anulados ? 0 : -1"
      class="-mb-px border-b-2 px-4 py-2 text-sm font-medium"
      :class="
        anulados === pestana.anulados
          ? 'border-campo-700 text-campo-800 dark:border-campo-400 dark:text-campo-300'
          : 'border-transparent text-tierra-600 hover:text-tierra-900 dark:text-tierra-300 dark:hover:text-white'
      "
      @click="anulados = pestana.anulados"
      @keydown="alPulsarFlecha"
    >
      {{ pestana.texto }}
    </button>
  </div>
</template>
