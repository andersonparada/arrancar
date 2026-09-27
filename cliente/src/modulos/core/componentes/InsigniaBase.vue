<script setup lang="ts">
withDefaults(defineProps<{ tono?: 'campo' | 'trigo' | 'tierra' | 'rojo' }>(), { tono: 'tierra' });

const tonos = {
  campo: 'bg-campo-100 text-campo-800 dark:bg-campo-900 dark:text-campo-200',
  trigo: 'bg-trigo-300/40 text-tierra-800 dark:bg-trigo-500/20 dark:text-trigo-300',
  tierra: 'bg-tierra-100 text-tierra-700 dark:bg-tierra-800 dark:text-tierra-200',
  rojo: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
};
</script>

<template>
  <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="tonos[tono]"
    ><slot
  /></span>
</template>
