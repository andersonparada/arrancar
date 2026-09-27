<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{ icono: Component; titulo: string; descripcion?: string }>();
</script>

<template>
  <div
    class="flex flex-col items-center rounded-2xl border border-dashed border-tierra-300 px-6 py-12 text-center dark:border-tierra-700"
  >
    <component :is="icono" class="size-10 text-tierra-400" aria-hidden="true" />
    <h2 class="mt-3 font-semibold">{{ titulo }}</h2>
    <p v-if="descripcion" class="mt-1 max-w-sm text-sm text-tierra-600 dark:text-tierra-300">{{ descripcion }}</p>
    <div v-if="$slots.default" class="mt-5">
      <slot />
    </div>
  </div>
</template>
