<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { formatearMonto, formatearNit } from '@/modulos/core/utilidades/formato';
import {
  proveedorParaRevisar,
  rutaDeDocumentosDelProveedor,
  tramosDe,
} from '../../composables/reportes/bloques-de-saldos';
import type { FilaDeSaldo } from '../../servicios/tipos-de-reportes';

/** Una fila de la tabla de saldos; `ficha` la pinta como subrenglón de un NIT con varias fichas. */
defineProps<{ fila: FilaDeSaldo; corte: string; ficha?: boolean }>();
</script>

<template>
  <tr :class="ficha ? 'text-xs text-tierra-600 dark:text-tierra-300' : 'font-medium'">
    <th scope="row" class="px-3 py-2 text-left font-normal print:text-[10px]" :class="ficha ? 'pl-8' : ''">
      <RouterLink
        v-if="proveedorParaRevisar(fila)"
        :to="rutaDeDocumentosDelProveedor(proveedorParaRevisar(fila)!, corte)"
        class="rounded font-medium text-campo-700 hover:underline focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none dark:text-campo-300 print:text-current print:no-underline"
      >
        {{ fila.nombre }}
      </RouterLink>
      <span v-else class="font-medium">{{ fila.nombre }}</span>
      <span class="block text-xs font-normal text-tierra-500 dark:text-tierra-300 print:text-[8px]">
        {{ ficha ? 'Ficha de proveedor' : `NIT ${formatearNit(fila.nit)}` }}
      </span>
    </th>
    <td v-for="tramo in tramosDe(fila)" :key="tramo.clave" class="px-3 py-2 text-right tabular-nums">
      {{ formatearMonto(tramo.monto) }}
    </td>
    <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(fila.totalCargos) }}</td>
    <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(fila.saldosAFavor) }}</td>
    <td class="px-3 py-2 text-right font-semibold tabular-nums">{{ formatearMonto(fila.saldoNeto) }}</td>
    <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(fila.comprometido) }}</td>
    <td class="px-3 py-2 text-right tabular-nums">
      {{ fila.disponible === null ? '—' : formatearMonto(fila.disponible) }}
    </td>
    <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(fila.sinAutorizar) }}</td>
  </tr>
</template>
