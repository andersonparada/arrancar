<script setup lang="ts">
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { TotalDePagosPorForma } from '../../servicios/tipos-de-reportes-de-pagos';

/** Lo pagado (vigentes) por forma de pago: monto, retenciones descontadas y lo que cubre. */
defineProps<{ totales: Array<TotalDePagosPorForma & { texto: string }> }>();
</script>

<template>
  <section v-if="totales.length" aria-label="Totales por forma de pago" class="overflow-x-auto">
    <table class="w-full text-sm print:text-[10px]">
      <caption class="pb-1 text-left text-xs font-medium text-tierra-500 dark:text-tierra-300">
        Por forma de pago (vigentes)
      </caption>
      <thead class="text-xs text-tierra-500 dark:text-tierra-300">
        <tr>
          <th scope="col" class="px-2 py-1 text-left font-medium">Forma</th>
          <th scope="col" class="px-2 py-1 text-right font-medium">Líneas</th>
          <th scope="col" class="px-2 py-1 text-right font-medium">Monto</th>
          <th scope="col" class="px-2 py-1 text-right font-medium">Retención</th>
          <th scope="col" class="px-2 py-1 text-right font-medium">Cubre</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="total in totales" :key="total.forma" class="border-t border-tierra-100 dark:border-tierra-700">
          <th scope="row" class="px-2 py-1 text-left font-normal">{{ total.texto }}</th>
          <td class="px-2 py-1 text-right tabular-nums">{{ total.lineas }}</td>
          <td class="px-2 py-1 text-right tabular-nums">{{ formatearMonto(total.monto) }}</td>
          <td class="px-2 py-1 text-right tabular-nums">{{ formatearMonto(total.retencion) }}</td>
          <td class="px-2 py-1 text-right tabular-nums">{{ formatearMonto(total.cubre) }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
