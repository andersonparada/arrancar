<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next';

/** Por qué no se registró, dicho por el servidor (o lo que falta); queda a la vista hasta el próximo intento. */
defineProps<{ mensaje: string }>();
</script>

<template>
  <p
    class="flex gap-2 rounded-2xl bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
    role="alert"
    tabindex="-1"
  >
    <TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
    <span>{{ mensaje }}</span>
  </p>
</template>
