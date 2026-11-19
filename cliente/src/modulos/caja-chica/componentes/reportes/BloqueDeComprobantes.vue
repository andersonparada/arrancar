<script setup lang="ts">
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { GrupoDeFondo } from '../../servicios/tipos-de-reportes';

/** Los comprobantes de un fondo en CC-R1 o CC-R3: cada uno con su concepto y si es deducible, y el subtotal. */
defineProps<{ grupo: GrupoDeFondo }>();
</script>

<template>
  <TarjetaBase class="print:break-inside-avoid print:shadow-none">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h2 class="font-semibold">{{ grupo.fondoNombre }}</h2>
      <p class="tabular-nums">
        <span class="text-lg font-semibold">{{ formatearMonto(grupo.total) }}</span>
        <span class="ml-2 text-xs text-tierra-500 dark:text-tierra-300">
          {{ grupo.cantidad }} {{ grupo.cantidad === 1 ? 'comprobante' : 'comprobantes' }} · deducible
          {{ formatearMonto(grupo.deducible) }} · no deducible {{ formatearMonto(grupo.noDeducible) }}
        </span>
      </p>
    </div>
    <ul class="mt-3 divide-y divide-tierra-100 text-sm dark:divide-tierra-700">
      <li v-for="fila in grupo.filas" :key="fila.id" class="space-y-1 py-2">
        <div class="flex flex-wrap items-baseline justify-between gap-x-4">
          <span class="font-medium"
            >{{ fila.documento }}<template v-if="fila.proveedor"> · {{ fila.proveedor }}</template></span
          >
          <span class="font-semibold tabular-nums">{{ formatearMonto(fila.monto) }}</span>
        </div>
        <p class="text-tierra-600 dark:text-tierra-300">
          {{ formatearFecha(fila.fecha) }} · {{ fila.concepto }} ·
          {{ fila.deducible ? 'Deducible' : 'No deducible' }}
        </p>
        <p v-if="fila.motivo" class="text-tierra-600 dark:text-tierra-300">{{ fila.motivo }}</p>
      </li>
    </ul>
  </TarjetaBase>
</template>
