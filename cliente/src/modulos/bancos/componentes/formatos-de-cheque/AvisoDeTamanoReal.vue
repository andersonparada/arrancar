<script setup lang="ts">
import { Info } from 'lucide-vue-next';

/** El recordatorio fijo antes de imprimir un cheque o su prueba: si el navegador achica o agrega márgenes, no cae donde debe. */
defineProps<{ avisos?: string[] }>();
</script>

<template>
  <div class="space-y-2 print:hidden">
    <p
      class="flex items-start gap-2 rounded-lg bg-campo-50 p-3 text-sm text-campo-900 dark:bg-campo-950 dark:text-campo-100"
    >
      <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        En el diálogo de impresión elija <strong>tamaño real (100 %)</strong>, <strong>sin márgenes</strong> y sin
        encabezados ni pies de página. Si el navegador ajusta la hoja al papel, nada caerá donde debe.
      </span>
    </p>
    <ul v-if="avisos?.length" class="space-y-1" role="alert">
      <li
        v-for="aviso in avisos"
        :key="aviso"
        class="rounded-lg bg-trigo-300/30 p-3 text-sm text-tierra-900 dark:bg-trigo-500/10 dark:text-trigo-300"
      >
        {{ aviso }}
      </li>
    </ul>
  </div>
</template>
