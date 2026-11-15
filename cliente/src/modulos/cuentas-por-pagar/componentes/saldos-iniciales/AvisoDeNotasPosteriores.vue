<script setup lang="ts">
import { Info } from 'lucide-vue-next';

/** Aviso de notas del libro que citan un saldo inicial y quedaron sin aplicar; no se muestra si el texto está vacío. */
defineProps<{ texto: string }>();
</script>

<template>
  <p
    v-if="texto"
    class="flex gap-2 rounded-lg bg-trigo-300/40 p-2 text-sm text-tierra-800 dark:bg-trigo-500/20 dark:text-trigo-300"
    role="note"
  >
    <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
    <span class="min-w-0 break-words">{{ texto }}</span>
  </p>
</template>
