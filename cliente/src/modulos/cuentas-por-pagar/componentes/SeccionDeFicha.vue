<script setup lang="ts">
defineProps<{ titulo: string }>();
</script>

<template>
  <section>
    <h2 class="mb-2 text-sm font-semibold text-tierra-700 dark:text-tierra-200">{{ titulo }}</h2>
    <slot />
  </section>
</template>
