<script setup lang="ts">
import type { DetalleDeConcepto } from '../../composables/movimientos-por-concepto/usar-detalles-por-concepto';
import type { ReporteDeMovimientosPorConcepto } from '../../servicios/movimientos-por-concepto.api';
import MontoDelFlujo from '../flujo-de-efectivo/MontoDelFlujo.vue';
import FilaDeConceptoDelReporte from './FilaDeConceptoDelReporte.vue';

/** La tabla del reporte: un concepto por fila (desplegable) y al final los totales; se desliza dentro de su tarjeta. */
defineProps<{ reporte: ReporteDeMovimientosPorConcepto; detalles: Record<string, DetalleDeConcepto> }>();
defineEmits<{ alternar: [conceptoId: string] }>();
</script>

<template>
  <div
    class="overflow-x-auto rounded-2xl bg-white ring-1 ring-tierra-200/70 print:overflow-visible print:shadow-none print:ring-0 dark:bg-tierra-800/60 dark:ring-tierra-700"
  >
    <table class="w-full min-w-[40rem] text-left text-sm">
      <caption class="sr-only">
        Entradas, salidas y cantidad de movimientos por concepto
      </caption>
      <thead class="border-b border-tierra-100 text-xs tracking-wide text-tierra-500 uppercase dark:border-tierra-700">
        <tr>
          <th scope="col" class="px-4 py-3 font-medium">Concepto</th>
          <th scope="col" class="px-4 py-3 text-right font-medium">Entradas</th>
          <th scope="col" class="px-4 py-3 text-right font-medium">Salidas</th>
          <th scope="col" class="px-4 py-3 text-right font-medium">Neto</th>
          <th scope="col" class="px-4 py-3 text-right font-medium">Movimientos</th>
          <th scope="col" class="px-4 py-3 text-right font-medium">Inversos</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
        <FilaDeConceptoDelReporte
          v-for="concepto in reporte.conceptos"
          :key="concepto.conceptoId"
          :concepto="concepto"
          :detalle="detalles[concepto.conceptoId]"
          @alternar="$emit('alternar', concepto.conceptoId)"
        />
        <tr class="bg-tierra-50/60 font-semibold dark:bg-tierra-900/40">
          <th scope="row" class="px-4 py-2.5">Total</th>
          <td class="px-4 py-2.5 text-right"><MontoDelFlujo :monto="reporte.entradas" /></td>
          <td class="px-4 py-2.5 text-right"><MontoDelFlujo :monto="reporte.salidas" /></td>
          <td class="px-4 py-2.5 text-right"><MontoDelFlujo :monto="reporte.neto" /></td>
          <td class="px-4 py-2.5 text-right">{{ reporte.cantidad }}</td>
          <td class="px-4 py-2.5" />
        </tr>
      </tbody>
    </table>
  </div>
</template>
