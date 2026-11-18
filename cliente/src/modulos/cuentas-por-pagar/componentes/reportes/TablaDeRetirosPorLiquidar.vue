<script setup lang="ts">
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { textoDeDiasAbierto, textoDeFormaDeRetiro } from '../../composables/reportes/retiros-por-liquidar';
import type { FilaDeRetiroPorLiquidar } from '../../servicios/tipos-de-reportes-de-efectivo';

/** Los retiros abiertos en tabla; se desliza dentro de su tarjeta, no la página. */
defineProps<{ filas: FilaDeRetiroPorLiquidar[] }>();
</script>

<template>
  <div
    class="overflow-x-auto rounded-2xl bg-white ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700 print:overflow-visible print:ring-0"
  >
    <table class="w-full text-sm print:text-[10px]">
      <caption class="sr-only">
        Retiros de efectivo por liquidar al corte
      </caption>
      <thead
        class="border-b border-tierra-100 text-xs text-tierra-500 dark:border-tierra-700 dark:text-tierra-300 print:table-header-group"
      >
        <tr>
          <th scope="col" class="px-3 py-2 text-left font-medium">Retiro</th>
          <th scope="col" class="px-3 py-2 text-left font-medium">Fecha</th>
          <th scope="col" class="px-3 py-2 text-left font-medium">Documento bancario</th>
          <th scope="col" class="px-3 py-2 text-left font-medium">Custodio</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Monto</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Pagado</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Disponible</th>
          <th scope="col" class="px-3 py-2 text-left font-medium">Abierto</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
        <tr v-for="fila in filas" :key="fila.id" class="align-top print:break-inside-avoid">
          <th scope="row" class="px-3 py-2 text-left font-medium whitespace-nowrap">N.º {{ fila.numero }}</th>
          <td class="px-3 py-2 whitespace-nowrap">{{ formatearFecha(fila.fecha) }}</td>
          <td class="px-3 py-2 whitespace-nowrap">{{ textoDeFormaDeRetiro(fila.forma) }} {{ fila.documento }}</td>
          <td class="min-w-36 px-3 py-2">{{ fila.custodio }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(fila.monto) }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(fila.pagado) }}</td>
          <td class="px-3 py-2 text-right font-semibold tabular-nums">{{ formatearMonto(fila.disponible) }}</td>
          <td class="px-3 py-2 whitespace-nowrap">
            {{ textoDeDiasAbierto(fila.diasAbierto) }}
            <InsigniaBase v-if="fila.deMesAnterior" tono="trigo" class="ml-1">De un mes anterior</InsigniaBase>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
