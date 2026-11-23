<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next';

/** Lo que le falta al usuario para llenar un formulario; no se muestra si no falta nada. */
defineProps<{ texto: string | null }>();
</script>

<template>
  <p
    v-if="texto"
    role="alert"
    class="flex items-start gap-2 rounded-lg bg-trigo-300/30 px-3 py-2 text-sm dark:bg-trigo-500/20"
  >
    <TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
    <span>{{ texto }}</span>
  </p>
</template>
