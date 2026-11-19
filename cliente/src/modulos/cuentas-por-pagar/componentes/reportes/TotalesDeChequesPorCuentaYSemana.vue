<script setup lang="ts">
import { formatearFecha, formatearMonto, formatearTexto } from '@/modulos/core/utilidades/formato';
import type { ReporteDeChequesPosfechados } from '../../servicios/tipos-de-reportes-de-pagos';

/** Lo comprometido por cuenta bancaria y por semana de vencimiento. */
defineProps<{ reporte: ReporteDeChequesPosfechados }>();
</script>

<template>
  <section aria-label="Totales por cuenta y por semana" class="grid grid-cols-1 gap-4 md:grid-cols-2">
    <table class="w-full text-sm print:text-[10px]">
      <caption class="pb-1 text-left text-xs font-medium text-tierra-500 dark:text-tierra-300">
        Por cuenta
      </caption>
      <thead class="sr-only">
        <tr>
          <th scope="col">Cuenta</th>
          <th scope="col">Cheques</th>
          <th scope="col">Monto</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="total in reporte.totalesPorCuenta"
          :key="total.cuentaBancariaId ?? 'sin-cuenta'"
          class="border-t border-tierra-100 dark:border-tierra-700"
        >
          <th scope="row" class="px-2 py-1 text-left font-normal">{{ formatearTexto(total.cuenta) }}</th>
          <td class="px-2 py-1 text-right tabular-nums">{{ total.cantidad }}</td>
          <td class="px-2 py-1 text-right tabular-nums">{{ formatearMonto(total.monto) }}</td>
        </tr>
      </tbody>
    </table>
    <table class="w-full text-sm print:text-[10px]">
      <caption class="pb-1 text-left text-xs font-medium text-tierra-500 dark:text-tierra-300">
        Por semana de vencimiento
      </caption>
      <thead class="sr-only">
        <tr>
          <th scope="col">Semana</th>
          <th scope="col">Cheques</th>
          <th scope="col">Monto</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="total in reporte.totalesPorSemana"
          :key="total.desde"
          class="border-t border-tierra-100 dark:border-tierra-700"
        >
          <th scope="row" class="px-2 py-1 text-left font-normal">
            {{ formatearFecha(total.desde) }} al {{ formatearFecha(total.hasta) }}
          </th>
          <td class="px-2 py-1 text-right tabular-nums">{{ total.cantidad }}</td>
          <td class="px-2 py-1 text-right tabular-nums">{{ formatearMonto(total.monto) }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
