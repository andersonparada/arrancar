<script setup lang="ts">
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';

/** «Último concepto con este beneficiario»: solo sugiere; quien registra decide si lo usa. */
defineProps<{ sugerencia: OpcionDeRegistro | null }>();
const emit = defineEmits<{ usar: [conceptoId: string] }>();
</script>

<template>
  <p v-if="sugerencia?.valor" class="-mt-2 text-sm text-tierra-600 dark:text-tierra-300">
    Último concepto con este beneficiario:
    <button
      type="button"
      class="font-medium text-campo-700 underline underline-offset-2 hover:text-campo-800 dark:text-campo-400"
      @click="emit('usar', sugerencia.valor)"
    >
      {{ sugerencia.texto }} (usar)
    </button>
  </p>
</template>
