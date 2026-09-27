<script setup lang="ts">
defineProps<{ etiqueta: string; descripcion?: string; deshabilitado?: boolean }>();
const modelo = defineModel<boolean>({ default: false });
</script>

<template>
  <label
    class="flex cursor-pointer items-start justify-between gap-4"
    :class="{ 'cursor-not-allowed opacity-60': deshabilitado }"
  >
    <span class="flex flex-col">
      <span class="text-sm font-medium text-tierra-800 dark:text-tierra-100">{{ etiqueta }}</span>
      <span v-if="descripcion" class="text-xs text-tierra-500">{{ descripcion }}</span>
    </span>
    <input v-model="modelo" type="checkbox" role="switch" class="peer sr-only" :disabled="deshabilitado" />
    <span
      class="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-tierra-300 transition-colors peer-checked:bg-campo-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-campo-500 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5 dark:bg-tierra-600"
      aria-hidden="true"
    />
  </label>
</template>
