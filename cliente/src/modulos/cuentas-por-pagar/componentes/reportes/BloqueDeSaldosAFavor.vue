<script setup lang="ts">
import { useId } from 'vue';
import type { FilaDeSaldoAFavor } from '../../servicios/tipos-de-reportes-de-proveedor';
import TablaDeSaldosAFavor from './TablaDeSaldosAFavor.vue';
import TarjetaDeSaldoAFavor from './TarjetaDeSaldoAFavor.vue';

/** Un grupo de notas (dentro del plazo o posiblemente prescritas): tarjetas en el celular y tabla en pantalla grande. */
defineProps<{ titulo: string; descripcion: string; filas: FilaDeSaldoAFavor[] }>();
const id = useId();
</script>

<template>
  <section :aria-labelledby="id" class="space-y-2 print:break-inside-avoid-page">
    <div>
      <h2 :id="id" class="font-semibold">{{ titulo }} ({{ filas.length }})</h2>
      <p class="text-sm text-tierra-600 dark:text-tierra-300">{{ descripcion }}</p>
    </div>
    <ul class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden print:hidden">
      <li v-for="fila in filas" :key="fila.id"><TarjetaDeSaldoAFavor :fila="fila" /></li>
    </ul>
    <div class="hidden lg:block print:block"><TablaDeSaldosAFavor :filas="filas" :titulo="titulo" /></div>
  </section>
</template>
