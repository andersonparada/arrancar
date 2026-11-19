<script setup lang="ts">
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { FondoDeReposiciones } from '../../servicios/tipos-de-reportes';

/** Lo repuesto de un fondo en CC-R2: sus reposiciones con su cheque o nota y lo repuesto por concepto de gasto. */
defineProps<{ fondo: FondoDeReposiciones }>();
</script>

<template>
  <TarjetaBase class="print:break-inside-avoid print:shadow-none">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h2 class="font-semibold">{{ fondo.fondoNombre }}</h2>
      <p class="tabular-nums">
        <span class="text-lg font-semibold">{{ formatearMonto(fondo.total) }}</span>
        <span class="ml-2 text-xs text-tierra-500 dark:text-tierra-300">
          deducible {{ formatearMonto(fondo.deducible) }} · no deducible {{ formatearMonto(fondo.noDeducible) }}
        </span>
      </p>
    </div>
    <h3 class="mt-3 text-xs font-medium uppercase tracking-wide text-tierra-500 dark:text-tierra-300">Reposiciones</h3>
    <ul class="divide-y divide-tierra-100 text-sm dark:divide-tierra-700">
      <li v-for="reposicion in fondo.reposiciones" :key="reposicion.id" class="py-2">
        <div class="flex flex-wrap items-baseline justify-between gap-x-4">
          <span class="font-medium">Reposición {{ reposicion.numero }} · {{ reposicion.respaldo }}</span>
          <span class="font-semibold tabular-nums">{{ formatearMonto(reposicion.monto) }}</span>
        </div>
        <p class="text-tierra-600 dark:text-tierra-300">{{ formatearFecha(reposicion.fecha) }}</p>
      </li>
    </ul>
    <h3 class="mt-3 text-xs font-medium uppercase tracking-wide text-tierra-500 dark:text-tierra-300">
      Por concepto de gasto
    </h3>
    <ul class="divide-y divide-tierra-100 text-sm dark:divide-tierra-700">
      <li v-for="concepto in fondo.conceptos" :key="concepto.concepto" class="py-2">
        <div class="flex flex-wrap items-baseline justify-between gap-x-4">
          <span class="font-medium">{{ concepto.concepto }}</span>
          <span class="font-semibold tabular-nums">{{ formatearMonto(concepto.total) }}</span>
        </div>
        <p class="tabular-nums text-tierra-600 dark:text-tierra-300">
          Deducible {{ formatearMonto(concepto.deducible) }} · No deducible {{ formatearMonto(concepto.noDeducible) }}
        </p>
      </li>
    </ul>
  </TarjetaBase>
</template>
