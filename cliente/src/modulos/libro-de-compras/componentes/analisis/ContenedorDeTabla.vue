<script setup lang="ts">
/** El marco de toda tabla de análisis: se desplaza dentro de su contenedor y la página nunca se desborda en el celular. */
defineProps<{ etiqueta: string }>();
</script>

<template>
  <div
    class="max-w-full overflow-x-auto rounded-2xl bg-white ring-1 ring-tierra-200/70 focus-visible:outline-2 dark:bg-tierra-800/60 dark:ring-tierra-700"
    role="region"
    :aria-label="etiqueta"
    tabindex="0"
  >
    <slot />
  </div>
</template>
