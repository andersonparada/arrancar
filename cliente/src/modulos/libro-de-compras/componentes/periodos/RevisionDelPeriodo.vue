<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next';
import type { AvisoDeRevision } from '../../servicios/periodos.api';
import { DETALLE_DE_PERIODO as textos } from '../../textos-de-periodos';

/** Lo que conviene revisar antes de declarar. Son avisos: nunca impiden declarar. */
defineProps<{ revision: AvisoDeRevision[] }>();
</script>

<template>
  <p v-if="revision.length === 0" class="text-sm text-tierra-500">{{ textos.sinRevision }}</p>
  <ul v-else class="space-y-2">
    <li
      v-for="aviso in revision"
      :key="aviso.codigo"
      class="flex gap-2 rounded-xl bg-trigo-300/40 p-3 text-sm text-tierra-900 dark:bg-trigo-500/20 dark:text-trigo-300"
    >
      <TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span class="min-w-0 break-words">{{ aviso.mensaje }}</span>
    </li>
  </ul>
</template>
