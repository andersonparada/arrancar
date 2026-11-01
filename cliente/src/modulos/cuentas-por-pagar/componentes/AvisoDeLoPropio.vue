<script setup lang="ts">
import { X } from 'lucide-vue-next';

/** El rechazo del servidor por autorizar algo que uno mismo ingresó o completó: se queda a la vista hasta cerrarlo. */
defineProps<{ mensaje: string }>();
defineEmits<{ cerrar: [] }>();
</script>

<template>
  <div
    v-if="mensaje"
    class="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
    role="alert"
  >
    <p>{{ mensaje }}</p>
    <button
      type="button"
      class="shrink-0 rounded p-1 hover:bg-red-100 dark:hover:bg-red-900"
      aria-label="Cerrar el aviso"
      @click="$emit('cerrar')"
    >
      <X class="size-4" aria-hidden="true" />
    </button>
  </div>
</template>
