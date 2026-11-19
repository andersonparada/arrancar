<script setup lang="ts">
import { formatearFecha, formatearMonto, formatearTexto } from '@/modulos/core/utilidades/formato';
import { formatearNumeroDeComprobante } from '../../composables/comunes/numero-de-comprobante';
import { textoDeConciliado } from '../../composables/comunes/mes-de-conciliacion';
import { marcaDeReversion } from '../../composables/movimientos/estado-de-reversion';
import { INSIGNIA_DE_APERTURA } from '../../composables/comunes/de-apertura';
import {
  creditoDeFila,
  debitoDeFila,
  documentoYConcepto,
  hayPartidasDeLaCarga,
  LEYENDA_DEL_SALDO_CORRIDO,
} from '../../composables/movimientos/fila-del-reporte';
import type { ReporteDeMovimientos } from '../../servicios/movimientos.api';

/** Saldo anterior, los movimientos con su saldo corrido y su mes de conciliación, y saldo final. */
defineProps<{ reporte: ReporteDeMovimientos }>();

const FILA_DE_SALDO = 'bg-tierra-50/60 font-medium dark:bg-tierra-900/40';
</script>

<template>
  <div
    class="overflow-x-auto rounded-2xl bg-white ring-1 ring-tierra-200/70 print:overflow-visible print:shadow-none print:ring-0 dark:bg-tierra-800/60 dark:ring-tierra-700"
  >
    <table class="w-full min-w-[44rem] text-left text-sm print:min-w-0 print:table-auto print:text-xs">
      <thead class="border-b border-tierra-100 text-xs tracking-wide text-tierra-500 uppercase dark:border-tierra-700">
        <tr>
          <th class="px-4 py-3 print:px-2 print:py-1.5 font-medium">Fecha</th>
          <th class="px-4 py-3 print:px-2 print:py-1.5 font-medium">No.</th>
          <th class="px-4 py-3 print:px-2 print:py-1.5 font-medium print:w-2/5">Concepto</th>
          <th class="px-4 py-3 print:px-2 print:py-1.5 text-right font-medium">Débito</th>
          <th class="px-4 py-3 print:px-2 print:py-1.5 text-right font-medium">Crédito</th>
          <th class="px-4 py-3 print:px-2 print:py-1.5 text-right font-medium">Saldo</th>
          <th class="px-4 py-3 print:px-2 print:py-1.5 font-medium">Conciliación</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
        <tr :class="FILA_DE_SALDO">
          <td class="px-4 py-2.5 print:px-2 print:py-1" colspan="5">Saldo anterior</td>
          <td class="px-4 py-2.5 print:px-2 print:py-1 text-right tabular-nums">
            {{ formatearMonto(reporte.saldoAnterior) }}
          </td>
          <td></td>
        </tr>
        <tr
          v-for="fila in reporte.filas"
          :key="fila.id"
          :class="fila.anuladoEn ? 'text-tierra-400 line-through dark:text-tierra-500' : ''"
        >
          <td class="px-4 py-2.5 print:px-2 print:py-1 whitespace-nowrap">{{ formatearFecha(fila.fecha) }}</td>
          <td class="px-4 py-2.5 print:px-2 print:py-1 whitespace-nowrap">
            {{ formatearTexto(formatearNumeroDeComprobante(fila)) }}
          </td>
          <td class="px-4 py-2.5 print:px-2 print:py-1">
            <p>{{ documentoYConcepto(fila) }}</p>
            <p v-if="fila.parteDeApertura" class="text-xs text-tierra-500 no-underline">{{ INSIGNIA_DE_APERTURA }}</p>
            <p v-if="fila.beneficiario" class="text-xs break-words text-tierra-500 no-underline">
              {{ fila.beneficiario }}
            </p>
            <p v-if="marcaDeReversion(fila)" class="text-xs text-amber-700 no-underline dark:text-amber-400">
              {{ marcaDeReversion(fila) }}
            </p>
          </td>
          <td class="px-4 py-2.5 print:px-2 print:py-1 text-right whitespace-nowrap tabular-nums">
            {{ formatearMonto(debitoDeFila(fila)) }}
          </td>
          <td class="px-4 py-2.5 print:px-2 print:py-1 text-right whitespace-nowrap tabular-nums">
            {{ formatearMonto(creditoDeFila(fila)) }}
          </td>
          <td class="px-4 py-2.5 print:px-2 print:py-1 text-right whitespace-nowrap tabular-nums">
            {{ formatearMonto(fila.saldo) }}
          </td>
          <td class="px-4 py-2.5 print:px-2 print:py-1 text-xs whitespace-nowrap no-underline">
            {{ textoDeConciliado(fila.conciliadoEn) }}
          </td>
        </tr>
        <tr v-if="!reporte.filas.length">
          <td class="px-4 py-6 text-center text-tierra-500" colspan="7">No hay movimientos en ese periodo.</td>
        </tr>
        <tr :class="FILA_DE_SALDO">
          <td class="px-4 py-2.5 print:px-2 print:py-1" colspan="5">Saldo final</td>
          <td class="px-4 py-2.5 print:px-2 print:py-1 text-right tabular-nums">
            {{ formatearMonto(reporte.saldoFinal) }}
          </td>
          <td></td>
        </tr>
      </tbody>
    </table>
  </div>
  <p v-if="hayPartidasDeLaCarga(reporte.filas)" class="mt-2 text-xs text-tierra-600 dark:text-tierra-300">
    {{ LEYENDA_DEL_SALDO_CORRIDO }}
  </p>
</template>
