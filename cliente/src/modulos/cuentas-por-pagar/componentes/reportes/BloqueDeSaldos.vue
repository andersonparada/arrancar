<script setup lang="ts">
import { cantidadDeFichas } from '../../composables/reportes/bloques-de-saldos';
import type { CifrasDeSaldo, FilaDeSaldo } from '../../servicios/tipos-de-reportes';
import TablaDeSaldos from './TablaDeSaldos.vue';
import TarjetaDeSaldo from './TarjetaDeSaldo.vue';

/**
 * Un bloque de R1: «con saldo acreedor» (lo que se debe) o «con saldo deudor» (lo que nos deben, en positivo, para la
 * reclasificación de cierre). En el celular son tarjetas; desde pantallas medianas y en papel, una tabla.
 */
defineProps<{
  titulo: string;
  descripcion: string;
  filas: FilaDeSaldo[];
  totales: CifrasDeSaldo;
  corte: string;
  deudor?: boolean;
}>();
</script>

<template>
  <section :aria-label="titulo" class="space-y-3 print:break-inside-avoid-page">
    <header>
      <h2 class="text-lg font-semibold">{{ titulo }} ({{ cantidadDeFichas(filas) }})</h2>
      <p class="text-sm text-tierra-600 dark:text-tierra-300">{{ descripcion }}</p>
    </header>
    <ul class="space-y-3 lg:hidden print:hidden">
      <li v-for="fila in filas" :key="fila.nit ?? fila.proveedorId ?? fila.nombre">
        <TarjetaDeSaldo :fila="fila" :corte="corte" :deudor="!!deudor" />
      </li>
    </ul>
    <div class="hidden lg:block print:block">
      <TablaDeSaldos :filas="filas" :totales="totales" :corte="corte" :titulo="titulo" />
    </div>
  </section>
</template>
