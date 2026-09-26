<script setup lang="ts">
defineProps<{ titulo: string; descripcion?: string }>();
</script>

<template>
  <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight text-tierra-900 dark:text-white">{{ titulo }}</h1>
      <p v-if="descripcion" class="mt-1 text-sm text-tierra-600 dark:text-tierra-300">{{ descripcion }}</p>
    </div>
    <div v-if="$slots.default" class="flex flex-wrap gap-2">
      <slot />
    </div>
  </header>
</template>
