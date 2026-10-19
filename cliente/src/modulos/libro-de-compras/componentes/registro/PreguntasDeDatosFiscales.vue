<script setup lang="ts">
import { useId } from 'vue';
import type { PreguntaFiscal, RespuestasFiscales } from '../../composables/documentos/preguntas-fiscales';

/** Las preguntas que hace el servidor sobre el proveedor; lo contestado viaja con el documento y se guarda en el proveedor. */
defineProps<{ preguntas: PreguntaFiscal[] }>();
const respuestas = defineModel<RespuestasFiscales>({ required: true });
const id = useId();

const contestar = (campo: string, valor: string) => (respuestas.value = { ...respuestas.value, [campo]: valor });
</script>

<template>
  <div class="space-y-4">
    <fieldset v-for="pregunta in preguntas" :key="pregunta.campo" class="space-y-2">
      <legend class="text-sm font-medium text-tierra-800 dark:text-tierra-100">{{ pregunta.pregunta }}</legend>
      <div class="flex flex-wrap gap-2">
        <label
          v-for="opcion in pregunta.opciones"
          :key="String(opcion.valor)"
          class="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-tierra-200 has-checked:bg-campo-100 has-checked:ring-2 has-checked:ring-campo-600 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-campo-500 dark:bg-tierra-800 dark:ring-tierra-700 dark:has-checked:bg-campo-900"
        >
          <input
            type="radio"
            :name="`${id}-${pregunta.campo}`"
            :value="String(opcion.valor)"
            :checked="respuestas[pregunta.campo] === String(opcion.valor)"
            class="size-4 accent-campo-700"
            @change="contestar(pregunta.campo, String(opcion.valor))"
          />
          {{ opcion.texto }}
        </label>
      </div>
    </fieldset>
  </div>
</template>
