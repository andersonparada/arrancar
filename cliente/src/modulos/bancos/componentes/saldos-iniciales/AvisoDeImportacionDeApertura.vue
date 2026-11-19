<script setup lang="ts">
/** El recordatorio dentro de la ventana de importar: el orden de los dos Excel y las reglas que más se olvidan. */
defineProps<{ notas: string[] }>();
</script>

<template>
  <ul
    class="list-disc space-y-1 rounded-lg bg-trigo-300/40 py-2.5 pr-3 pl-7 text-tierra-800 dark:bg-trigo-500/20 dark:text-trigo-300"
  >
    <li v-for="nota in notas" :key="nota">{{ nota }}</li>
  </ul>
</template>
