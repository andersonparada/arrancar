<script setup lang="ts">
import { TITULOS_DE_ACTIVIDAD } from '../../composables/flujo-de-efectivo/textos-del-flujo';
import type { ActividadDeFlujo } from '../../servicios/flujo-de-efectivo.api';
import MontoDelFlujo from './MontoDelFlujo.vue';

/** Una actividad del flujo (operación, inversión o financiamiento): sus líneas y su total. */
defineProps<{ actividad: ActividadDeFlujo }>();
</script>

<template>
  <div
    class="overflow-x-auto rounded-2xl bg-white ring-1 ring-tierra-200/70 print:overflow-visible print:shadow-none print:ring-0 dark:bg-tierra-800/60 dark:ring-tierra-700"
  >
    <table class="w-full min-w-[30rem] text-left text-sm">
      <caption class="px-4 pt-4 pb-2 text-left text-base font-semibold">
        {{
          TITULOS_DE_ACTIVIDAD[actividad.actividad]
        }}
      </caption>
      <thead class="border-b border-tierra-100 text-xs tracking-wide text-tierra-500 uppercase dark:border-tierra-700">
        <tr>
          <th scope="col" class="px-4 py-2 font-medium">Línea</th>
          <th scope="col" class="px-4 py-2 text-right font-medium">Entradas</th>
          <th scope="col" class="px-4 py-2 text-right font-medium">Salidas</th>
          <th scope="col" class="px-4 py-2 text-right font-medium">Neto</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
        <tr v-for="linea in actividad.lineas" :key="linea.etiqueta">
          <th scope="row" class="px-4 py-2.5 font-normal">{{ linea.etiqueta }}</th>
          <td class="px-4 py-2.5 text-right"><MontoDelFlujo :monto="linea.entradas" /></td>
          <td class="px-4 py-2.5 text-right"><MontoDelFlujo :monto="linea.salidas" /></td>
          <td class="px-4 py-2.5 text-right"><MontoDelFlujo :monto="linea.neto" /></td>
        </tr>
        <tr v-if="!actividad.lineas.length">
          <td class="px-4 py-4 text-center text-tierra-500" colspan="4">Sin movimientos en este rango.</td>
        </tr>
        <tr class="bg-tierra-50/60 font-semibold dark:bg-tierra-900/40">
          <th scope="row" class="px-4 py-2.5">Total</th>
          <td class="px-4 py-2.5 text-right"><MontoDelFlujo :monto="actividad.entradas" /></td>
          <td class="px-4 py-2.5 text-right"><MontoDelFlujo :monto="actividad.salidas" /></td>
          <td class="px-4 py-2.5 text-right"><MontoDelFlujo :monto="actividad.neto" /></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
