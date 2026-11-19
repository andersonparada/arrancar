<script setup lang="ts">
import { RouterLink } from 'vue-router';
import type { FilaDeConciliacion } from '../../composables/reportes/resumen-de-reportes';

/** Al pie de R1: el auxiliar menos los pagos por aplicar es lo que se presenta como Proveedores. */
defineProps<{ filas: FilaDeConciliacion[]; corte: string }>();
</script>

<template>
  <section aria-label="Conciliación con pagos por aplicar" class="space-y-2 print:break-inside-avoid">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h2 class="text-base font-semibold">Conciliación con pagos por aplicar</h2>
      <RouterLink
        v-permiso="'cuentas-por-pagar.reportes-de-pagos.ver'"
        :to="{ name: 'cuentas-por-pagar.reportes.notas-sin-aplicar', query: { corte } }"
        class="rounded text-sm text-campo-700 hover:underline focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none dark:text-campo-300 print:hidden"
      >
        Ver las notas sin aplicar
      </RouterLink>
    </div>
    <dl class="rounded-2xl bg-white ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700 print:ring-0">
      <div
        v-for="fila in filas"
        :key="fila.etiqueta"
        class="flex items-baseline justify-between gap-3 border-t border-tierra-100 px-3 py-2 first:border-t-0 dark:border-tierra-700"
        :class="fila.total ? 'font-semibold' : ''"
      >
        <dt class="text-sm">{{ fila.etiqueta }}</dt>
        <dd class="tabular-nums">{{ fila.valor }}</dd>
      </div>
    </dl>
    <p class="text-xs text-tierra-600 dark:text-tierra-300">
      Los pagos por aplicar son notas de débito ya pagadas en Bancos que aún no se aplicaron a un documento: la
      transitoria se resta de Proveedores al presentar.
    </p>
  </section>
</template>
