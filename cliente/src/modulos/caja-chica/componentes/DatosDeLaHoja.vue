<script setup lang="ts">
import type { DetalleDeRegistro } from '@/modulos/core/tipos';

/** Los datos de una hoja impresa, en dos columnas, con la etiqueta en negrita. */
defineProps<{ datos: DetalleDeRegistro[] }>();
</script>

<template>
  <dl class="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2 print:grid-cols-2">
    <div v-for="dato in datos" :key="dato.etiqueta" :class="dato.largo ? 'sm:col-span-2 print:col-span-2' : ''">
      <dt class="inline font-semibold">{{ dato.etiqueta }}:</dt>
      <dd class="inline break-words">{{ dato.valor }}</dd>
    </div>
  </dl>
</template>
