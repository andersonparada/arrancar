<script setup lang="ts">
/** Las leyendas contables al pie de un reporte. */
defineProps<{ leyendas: string[] }>();
</script>

<template>
  <ul v-if="leyendas.length" aria-label="Leyendas" class="space-y-1 text-xs text-tierra-600 dark:text-tierra-300">
    <li v-for="leyenda in leyendas" :key="leyenda">{{ leyenda }}</li>
  </ul>
</template>
