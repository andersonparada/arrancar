<script setup lang="ts">
import { useId } from 'vue';
import {
  alternarConcepto,
  MAXIMO_DE_CONCEPTOS,
  resumenDeConceptosElegidos,
} from '../../composables/movimientos-por-concepto/filtros-por-concepto';

/** Varios conceptos a la vez, en una lista con casillas; sin ninguno marcado, el reporte trae todos. */
defineProps<{ opciones: Array<{ id: string; nombre: string }> }>();
const elegidos = defineModel<string[]>({ required: true });
const id = useId();
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span :id="id" class="text-sm font-medium text-tierra-700 dark:text-tierra-200">Conceptos</span>
    <details class="group rounded-lg bg-white ring-1 ring-tierra-200 dark:bg-tierra-800 dark:ring-tierra-700">
      <summary
        :aria-labelledby="id"
        class="cursor-pointer list-none rounded-lg px-3 py-2.5 text-base focus-visible:ring-2 focus-visible:ring-campo-500 sm:text-sm"
      >
        {{ resumenDeConceptosElegidos(elegidos) }}
      </summary>
      <fieldset class="max-h-64 overflow-y-auto border-t border-tierra-100 p-2 dark:border-tierra-700">
        <legend class="sr-only">Conceptos que entran al reporte</legend>
        <label
          v-for="opcion in opciones"
          :key="opcion.id"
          class="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm hover:bg-tierra-50 dark:hover:bg-tierra-700/40"
        >
          <input
            type="checkbox"
            class="size-4 rounded text-campo-600 focus:ring-campo-500"
            :checked="elegidos.includes(opcion.id)"
            @change="elegidos = alternarConcepto(elegidos, opcion.id)"
          />
          {{ opcion.nombre }}
        </label>
        <p v-if="elegidos.length >= MAXIMO_DE_CONCEPTOS" class="px-2 pt-1 text-xs text-tierra-500">
          Máximo {{ MAXIMO_DE_CONCEPTOS }} conceptos a la vez.
        </p>
      </fieldset>
      <button
        v-if="elegidos.length"
        type="button"
        class="w-full border-t border-tierra-100 px-3 py-2.5 text-left text-sm font-medium text-campo-700 dark:border-tierra-700 dark:text-campo-300"
        @click="elegidos = []"
      >
        Quitar la selección (ver todos)
      </button>
    </details>
  </div>
</template>
