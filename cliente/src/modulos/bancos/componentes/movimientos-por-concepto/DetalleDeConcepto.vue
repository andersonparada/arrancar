<script setup lang="ts">
import { formatearFecha, formatearMonto, formatearTexto } from '@/modulos/core/utilidades/formato';
import type { DetalleDeConcepto } from '../../composables/movimientos-por-concepto/usar-detalles-por-concepto';
import { marcaDeReversion } from '../../composables/movimientos/estado-de-reversion';
import { creditoDeFila, debitoDeFila, documentoDeFila } from '../../composables/movimientos/fila-del-reporte';

/** Los movimientos de un concepto en el rango, con su marca si son una anulación o fueron anulados. */
defineProps<{ detalle: DetalleDeConcepto }>();
</script>

<template>
  <p v-if="detalle.cargando" class="px-4 py-3 text-sm text-tierra-500">Cargando el detalle…</p>
  <p v-else-if="!detalle.filas.length" class="px-4 py-3 text-sm text-tierra-500">Sin movimientos con este filtro.</p>
  <table v-else class="w-full text-left text-xs sm:text-sm">
    <thead class="text-xs text-tierra-500 uppercase">
      <tr>
        <th scope="col" class="px-4 py-2 font-medium">Fecha</th>
        <th scope="col" class="px-4 py-2 font-medium">Documento</th>
        <th scope="col" class="px-4 py-2 font-medium">Beneficiario u origen</th>
        <th scope="col" class="px-4 py-2 text-right font-medium">Débito</th>
        <th scope="col" class="px-4 py-2 text-right font-medium">Crédito</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
      <tr v-for="fila in detalle.filas" :key="fila.id" :class="fila.anuladoEn ? 'text-tierra-400 line-through' : ''">
        <td class="px-4 py-2 whitespace-nowrap">{{ formatearFecha(fila.fecha) }}</td>
        <td class="px-4 py-2">
          {{ documentoDeFila(fila).titulo }}
          <span v-if="fila.cuentaBancariaNombre" class="text-tierra-500"> · {{ fila.cuentaBancariaNombre }}</span>
          <span v-if="marcaDeReversion(fila)" class="block text-amber-600 no-underline dark:text-amber-400">
            {{ marcaDeReversion(fila) }}
          </span>
        </td>
        <td class="px-4 py-2">{{ formatearTexto(fila.beneficiario) }}</td>
        <td class="px-4 py-2 text-right whitespace-nowrap">{{ formatearMonto(debitoDeFila(fila)) }}</td>
        <td class="px-4 py-2 text-right whitespace-nowrap">{{ formatearMonto(creditoDeFila(fila)) }}</td>
      </tr>
    </tbody>
  </table>
</template>
