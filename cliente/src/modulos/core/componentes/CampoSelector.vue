<script setup lang="ts" generic="T extends string | number | null">
import { useId } from 'vue';

defineProps<{
  etiqueta: string;
  opciones: { valor: T; texto: string }[];
  error?: string;
  requerido?: boolean;
  ocultarEtiqueta?: boolean;
}>();

const modelo = defineModel<T>();
const id = useId();
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="id" :class="ocultarEtiqueta ? 'sr-only' : 'text-sm font-medium text-tierra-700 dark:text-tierra-200'">
      {{ etiqueta }}<span v-if="requerido" class="text-red-600" aria-hidden="true"> *</span>
    </label>
    <select
      :id="id"
      v-model="modelo"
      :aria-invalid="!!error"
      class="rounded-lg border-0 bg-white px-3 py-2.5 text-base ring-1 ring-tierra-200 focus:ring-2 focus:ring-campo-500 aria-invalid:ring-red-500 sm:text-sm dark:bg-tierra-800 dark:ring-tierra-700"
    >
      <option v-for="opcion in opciones" :key="String(opcion.valor)" :value="opcion.valor">{{ opcion.texto }}</option>
    </select>
    <p v-if="error" class="text-sm text-red-700 dark:text-red-400">{{ error }}</p>
  </div>
</template>
