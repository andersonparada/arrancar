<script setup lang="ts">
import { CircleCheck, X } from 'lucide-vue-next';

/** Lo que el servidor avisó al registrar el documento; no bloqueó nada, pero conviene leerlo. */
defineProps<{ avisos: string[] }>();
defineEmits<{ cerrar: [] }>();
</script>

<template>
  <section
    v-if="avisos.length"
    class="rounded-2xl bg-trigo-300/40 p-4 text-sm text-tierra-900 dark:bg-trigo-500/20 dark:text-trigo-300"
    role="status"
    aria-label="Avisos del registro"
  >
    <div class="flex items-start justify-between gap-3">
      <p class="flex items-center gap-2 font-semibold">
        <CircleCheck class="size-4 shrink-0" aria-hidden="true" /> Documento registrado. Tenga en cuenta:
      </p>
      <button
        type="button"
        class="-m-1 rounded-lg p-1 hover:bg-tierra-900/10 dark:hover:bg-white/10"
        aria-label="Cerrar los avisos"
        @click="$emit('cerrar')"
      >
        <X class="size-4" aria-hidden="true" />
      </button>
    </div>
    <ul class="mt-2 list-disc space-y-1.5 pl-6">
      <li v-for="aviso in avisos" :key="aviso">{{ aviso }}</li>
    </ul>
  </section>
</template>
