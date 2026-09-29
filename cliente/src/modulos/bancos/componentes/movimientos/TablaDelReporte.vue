<script setup lang="ts">
import { formatearFecha, formatearMonto, formatearTexto } from '@/modulos/core/utilidades/formato';
import { formatearNumeroDeComprobante } from '../../composables/comunes/numero-de-comprobante';
import { marcaDeReversion } from '../../composables/movimientos/estado-de-reversion';
import { creditoDeFila, debitoDeFila, documentoDeFila } from '../../composables/movimientos/fila-del-reporte';
import type { ReporteDeMovimientos } from '../../servicios/movimientos.api';

/**
 * La tabla del reporte: fila de "Saldo anterior" al inicio y "Saldo final" al
 * final cuando hay una cuenta elegida (si no, ninguna columna de saldo). Un movimiento
 * revertido y su inverso se ven juntos, con su marca, y se cancelan en el saldo; solo un
 * cheque anulado a la antigua (mes abierto) va en gris, tachado y sin mover el saldo.
 */
defineProps<{ reporte: ReporteDeMovimientos; conCuenta: boolean }>();

const CLASE_DE_MARCA = {
  Anulado: 'text-red-500',
  Revertido: 'text-amber-600 dark:text-amber-400',
  Reversión: 'text-amber-600 dark:text-amber-400',
};
</script>

<template>
  <div
    class="overflow-x-auto rounded-2xl bg-white ring-1 ring-tierra-200/70 print:overflow-visible print:shadow-none print:ring-0 dark:bg-tierra-800/60 dark:ring-tierra-700"
  >
    <table class="w-full min-w-[52rem] text-left text-sm">
      <thead class="border-b border-tierra-100 text-xs tracking-wide text-tierra-500 uppercase dark:border-tierra-700">
        <tr>
          <th class="px-4 py-3 font-medium">Fecha</th>
          <th class="px-4 py-3 font-medium">Cuenta</th>
          <th class="px-4 py-3 font-medium">No.</th>
          <th class="px-4 py-3 font-medium">Documento</th>
          <th class="px-4 py-3 font-medium">Beneficiario u origen</th>
          <th class="px-4 py-3 text-right font-medium">Débito</th>
          <th class="px-4 py-3 text-right font-medium">Crédito</th>
          <th v-if="conCuenta" class="px-4 py-3 text-right font-medium">Saldo</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
        <tr v-if="conCuenta" class="bg-tierra-50/60 font-medium dark:bg-tierra-900/40">
          <td class="px-4 py-2.5" colspan="7">Saldo anterior</td>
          <td class="px-4 py-2.5 text-right">{{ formatearMonto(reporte.saldoAnterior) }}</td>
        </tr>
        <tr
          v-for="fila in reporte.filas"
          :key="fila.id"
          :class="fila.anuladoEn ? 'text-tierra-400 line-through dark:text-tierra-500' : ''"
        >
          <td class="px-4 py-2.5 whitespace-nowrap">{{ formatearFecha(fila.fecha) }}</td>
          <td class="px-4 py-2.5">{{ formatearTexto(fila.cuentaBancariaNombre) }}</td>
          <td class="px-4 py-2.5 whitespace-nowrap">{{ formatearTexto(formatearNumeroDeComprobante(fila)) }}</td>
          <td class="px-4 py-2.5">
            <p>{{ documentoDeFila(fila).titulo }}</p>
            <p v-if="documentoDeFila(fila).subtitulo" class="text-xs text-tierra-500">
              {{ documentoDeFila(fila).subtitulo }}
            </p>
            <p
              v-if="marcaDeReversion(fila)"
              class="text-xs no-underline"
              :class="CLASE_DE_MARCA[marcaDeReversion(fila)!]"
            >
              {{ marcaDeReversion(fila) }}
            </p>
          </td>
          <td class="px-4 py-2.5">{{ formatearTexto(fila.beneficiario) }}</td>
          <td class="px-4 py-2.5 text-right whitespace-nowrap">{{ formatearMonto(debitoDeFila(fila)) }}</td>
          <td class="px-4 py-2.5 text-right whitespace-nowrap">{{ formatearMonto(creditoDeFila(fila)) }}</td>
          <td v-if="conCuenta" class="px-4 py-2.5 text-right whitespace-nowrap">{{ formatearMonto(fila.saldo) }}</td>
        </tr>
        <tr v-if="!reporte.filas.length">
          <td class="px-4 py-6 text-center text-tierra-500" :colspan="conCuenta ? 8 : 7">
            No hay movimientos con ese filtro.
          </td>
        </tr>
        <tr v-if="conCuenta" class="bg-tierra-50/60 font-medium dark:bg-tierra-900/40">
          <td class="px-4 py-2.5" colspan="7">Saldo final</td>
          <td class="px-4 py-2.5 text-right">{{ formatearMonto(reporte.saldoFinal) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
