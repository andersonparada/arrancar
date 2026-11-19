<script setup lang="ts">
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { textoDeCuotas } from '../../composables/reportes/no-liquidado';
import type { GrupoDeNoLiquidado } from '../../servicios/tipos-de-reportes';

/** Lo no liquidado con un destino: sus anticipos y el subtotal. */
defineProps<{ grupo: GrupoDeNoLiquidado }>();
</script>

<template>
  <TarjetaBase class="print:break-inside-avoid print:shadow-none">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h2 class="font-semibold">{{ grupo.titulo }}</h2>
      <p class="tabular-nums">
        <span class="text-lg font-semibold">{{ formatearMonto(grupo.monto) }}</span>
        <span class="ml-2 text-xs text-tierra-500 dark:text-tierra-300">
          {{ grupo.cantidad }} {{ grupo.cantidad === 1 ? 'anticipo' : 'anticipos' }}
        </span>
      </p>
    </div>
    <p v-if="grupo.filas.length === 0" class="mt-2 text-sm text-tierra-500 dark:text-tierra-300">
      Ninguno en el período.
    </p>
    <ul v-else class="mt-3 divide-y divide-tierra-100 text-sm dark:divide-tierra-700">
      <li v-for="fila in grupo.filas" :key="fila.id" class="space-y-1 py-2">
        <div class="flex flex-wrap items-baseline justify-between gap-x-4">
          <span class="font-medium">N.º {{ fila.numero }} · {{ fila.beneficiario }}</span>
          <span class="font-semibold tabular-nums">{{ formatearMonto(fila.noLiquidado) }}</span>
        </div>
        <p class="text-tierra-600 dark:text-tierra-300">
          Liquidado el {{ formatearFecha(fila.fechaDeLiquidacion) }}
          <template v-if="fila.cuotas !== null && fila.valorDeCuota !== null">
            · {{ textoDeCuotas(fila.cuotas) }} de {{ formatearMonto(fila.valorDeCuota) }}
          </template>
        </p>
        <p class="text-tierra-600 dark:text-tierra-300">{{ fila.motivo }}</p>
      </li>
    </ul>
  </TarjetaBase>
</template>
