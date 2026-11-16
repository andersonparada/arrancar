<script setup lang="ts">
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearCantidad, formatearMonto } from '@/modulos/core/utilidades/formato';
import { COLUMNAS_DE_TRAMOS } from '../../composables/reportes/bloques-de-saldos';
import type { TotalesDeSaldos } from '../../servicios/tipos-de-reportes';

/** Cuánto de todos los cargos hay en cada tramo (el porcentaje es sobre los cargos, no sobre el saldo neto). */
defineProps<{ totales: TotalesDeSaldos }>();
</script>

<template>
  <TarjetaBase class="print:ring-0">
    <h2 class="text-lg font-semibold">Antigüedad de los cargos</h2>
    <p class="mb-3 text-sm text-tierra-600 dark:text-tierra-300">
      Porcentaje sobre el total de cargos ({{ formatearMonto(totales.totalCargos) }}); los saldos a favor no tienen
      tramo.
    </p>
    <dl class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 print:grid-cols-6">
      <div v-for="tramo in COLUMNAS_DE_TRAMOS" :key="tramo.clave">
        <dt class="text-xs text-tierra-500 dark:text-tierra-300">{{ tramo.etiqueta }}</dt>
        <dd class="font-semibold tabular-nums">
          {{ formatearCantidad(totales.porcentajesPorTramo[tramo.clave], '%') }}
        </dd>
        <dd class="text-xs tabular-nums text-tierra-600 dark:text-tierra-300">
          {{ formatearMonto(totales.cargosPorTramo[tramo.clave]) }}
        </dd>
      </div>
    </dl>
  </TarjetaBase>
</template>
