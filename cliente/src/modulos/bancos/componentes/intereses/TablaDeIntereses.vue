<script setup lang="ts">
import { formatearFecha, formatearMonto, formatearTexto } from '@/modulos/core/utilidades/formato';
import type { InteresDelReporte } from '../../servicios/intereses.api';

/** Cada nota de intereses; en el celular la tabla se desliza dentro de su tarjeta, sin mover la página. */
defineProps<{ intereses: InteresDelReporte[] }>();
</script>

<template>
  <div
    class="overflow-x-auto rounded-2xl bg-white ring-1 ring-tierra-200/70 print:overflow-visible print:shadow-none print:ring-0 dark:bg-tierra-800/60 dark:ring-tierra-700"
  >
    <table class="w-full min-w-[46rem] text-left text-sm">
      <caption class="sr-only">
        Notas de intereses con su ISR retenido
      </caption>
      <thead class="border-b border-tierra-100 text-xs tracking-wide text-tierra-500 uppercase dark:border-tierra-700">
        <tr>
          <th scope="col" class="px-4 py-3 font-medium">Fecha</th>
          <th scope="col" class="px-4 py-3 font-medium">Cuenta</th>
          <th scope="col" class="px-4 py-3 font-medium">No.</th>
          <th scope="col" class="px-4 py-3 font-medium">Referencia</th>
          <th scope="col" class="px-4 py-3 text-right font-medium">Interés bruto</th>
          <th scope="col" class="px-4 py-3 text-right font-medium">ISR retenido</th>
          <th scope="col" class="px-4 py-3 text-right font-medium">Neto</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
        <tr v-for="interes in intereses" :key="interes.movimientoId">
          <td class="px-4 py-2.5 whitespace-nowrap">{{ formatearFecha(interes.fecha) }}</td>
          <td class="px-4 py-2.5">{{ interes.cuentaBancariaNombre }}</td>
          <td class="px-4 py-2.5 whitespace-nowrap">{{ formatearTexto(interes.numero) }}</td>
          <td class="px-4 py-2.5">{{ formatearTexto(interes.referencia) }}</td>
          <td class="px-4 py-2.5 text-right whitespace-nowrap">{{ formatearMonto(interes.interesBruto) }}</td>
          <td class="px-4 py-2.5 text-right whitespace-nowrap">{{ formatearMonto(interes.isrRetenido) }}</td>
          <td class="px-4 py-2.5 text-right whitespace-nowrap">{{ formatearMonto(interes.neto) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
