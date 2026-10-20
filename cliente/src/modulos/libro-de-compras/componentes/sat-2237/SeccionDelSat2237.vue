<script setup lang="ts">
/** Un bloque de la pantalla: título, ayuda corta y el contenido. */
defineProps<{ titulo: string; ayuda: string }>();
</script>

<template>
  <section class="mt-6" :aria-label="titulo">
    <h2 class="text-lg font-semibold">{{ titulo }}</h2>
    <p class="mb-3 text-sm text-tierra-600 dark:text-tierra-300">{{ ayuda }}</p>
    <slot />
  </section>
</template>
