<script setup lang="ts">
import { Info } from 'lucide-vue-next';
import { AVISO_DE_LO_QUE_SE_CARGA, AVISO_DE_NOTAS_POSTERIORES } from '../../textos';

/** Los avisos fijos del contador al cargar saldos iniciales, a mano o por Excel. */
</script>

<template>
  <div
    class="space-y-1 rounded-lg bg-trigo-300/40 p-3 text-sm text-tierra-800 dark:bg-trigo-500/20 dark:text-trigo-300"
  >
    <p class="flex gap-2">
      <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{{ AVISO_DE_LO_QUE_SE_CARGA }}</span>
    </p>
    <p class="pl-6">{{ AVISO_DE_NOTAS_POSTERIORES }}</p>
  </div>
</template>
