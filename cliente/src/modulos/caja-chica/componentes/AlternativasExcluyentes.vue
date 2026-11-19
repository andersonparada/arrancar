<script setup lang="ts" generic="T extends string | boolean">
import { useId } from 'vue';

/** Una pregunta con pocas respuestas que se excluyen entre sí: radios nativos (teclado y lector de pantalla gratis). */
defineProps<{
  leyenda: string;
  opciones: readonly { valor: T; texto: string; ayuda?: string }[];
  requerido?: boolean;
  error?: string;
}>();
const modelo = defineModel<T | null>({ required: true });
const nombre = useId();
</script>

<template>
  <fieldset class="space-y-2">
    <legend class="text-sm font-medium">
      {{ leyenda }}<span v-if="requerido" class="text-red-700 dark:text-red-400" aria-hidden="true"> *</span>
    </legend>
    <label
      v-for="opcion in opciones"
      :key="String(opcion.valor)"
      class="flex cursor-pointer items-start gap-3 rounded-xl p-2 ring-1 ring-tierra-200 has-[:checked]:bg-campo-100/60 has-[:checked]:ring-campo-500 dark:ring-tierra-700 dark:has-[:checked]:bg-campo-900/40"
    >
      <input
        v-model="modelo"
        type="radio"
        :name="nombre"
        :value="opcion.valor"
        class="mt-0.5 size-5 shrink-0 border-tierra-300 text-campo-600 focus:ring-campo-500"
      />
      <span class="min-w-0">
        <span class="block text-sm font-medium">{{ opcion.texto }}</span>
        <span v-if="opcion.ayuda" class="block text-xs text-tierra-600 dark:text-tierra-300">{{ opcion.ayuda }}</span>
      </span>
    </label>
    <p v-if="error" class="text-sm text-red-700 dark:text-red-400" role="alert">{{ error }}</p>
  </fieldset>
</template>
