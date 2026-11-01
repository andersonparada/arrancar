<script setup lang="ts">
import { Info } from 'lucide-vue-next';

/** Un recuadro con un recordatorio corto. */
defineProps<{ titulo: string; texto: string }>();
</script>

<template>
  <div
    class="flex items-start gap-2 rounded-2xl bg-campo-100 p-3 text-sm text-campo-900 dark:bg-campo-900/40 dark:text-campo-100"
    role="note"
  >
    <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
    <p>
      <strong>{{ titulo }}.</strong> {{ texto }}
    </p>
  </div>
</template>
