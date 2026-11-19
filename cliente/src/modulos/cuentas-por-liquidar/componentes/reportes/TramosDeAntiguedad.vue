<script setup lang="ts">
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { TramoDelReporte } from '../../servicios/tipos-de-reportes';

/** Lo por justificar según los días que pasaron de la fecha límite. */
defineProps<{ tramos: TramoDelReporte[] }>();
</script>

<template>
  <section aria-label="Antigüedad" class="print:break-inside-avoid">
    <dl class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 print:grid-cols-5 print:gap-2">
      <div
        v-for="tramo in tramos"
        :key="tramo.tramo"
        class="rounded-xl bg-tierra-50 px-3 py-2 ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700 print:bg-transparent"
      >
        <dt class="text-xs text-tierra-500 dark:text-tierra-300">{{ tramo.titulo }}</dt>
        <dd class="text-base font-medium tabular-nums">{{ formatearMonto(tramo.porJustificar) }}</dd>
        <dd class="text-xs text-tierra-500 dark:text-tierra-300">
          {{ tramo.cantidad }} {{ tramo.cantidad === 1 ? 'anticipo' : 'anticipos' }}
        </dd>
      </div>
    </dl>
  </section>
</template>
