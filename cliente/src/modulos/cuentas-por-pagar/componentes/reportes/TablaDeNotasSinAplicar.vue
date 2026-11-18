<script setup lang="ts">
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { formatearFecha, formatearMonto, formatearTexto } from '@/modulos/core/utilidades/formato';
import { textoDeConciliada, textoDeDiasSinAplicar } from '../../composables/reportes/notas-sin-aplicar';
import type { FilaDeNotaSinAplicar } from '../../servicios/tipos-de-reportes-de-efectivo';

/** Las notas de débito sin aplicar en tabla; se desliza dentro de su tarjeta, no la página. */
defineProps<{ filas: FilaDeNotaSinAplicar[] }>();
</script>

<template>
  <div
    class="overflow-x-auto rounded-2xl bg-white ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700 print:overflow-visible print:ring-0"
  >
    <table class="w-full text-sm print:text-[10px]">
      <caption class="sr-only">
        Notas de débito para proveedores sin aplicar al corte
      </caption>
      <thead
        class="border-b border-tierra-100 text-xs text-tierra-500 dark:border-tierra-700 dark:text-tierra-300 print:table-header-group"
      >
        <tr>
          <th scope="col" class="px-3 py-2 text-left font-medium">Fecha</th>
          <th scope="col" class="px-3 py-2 text-left font-medium">Cuenta y nota</th>
          <th scope="col" class="px-3 py-2 text-left font-medium">Referencia</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Monto</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Aplicado</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Disponible</th>
          <th scope="col" class="px-3 py-2 text-left font-medium">Sin aplicar</th>
          <th scope="col" class="px-3 py-2 text-left font-medium">Conciliación</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
        <tr v-for="fila in filas" :key="fila.movimientoId" class="align-top print:break-inside-avoid">
          <th scope="row" class="px-3 py-2 text-left font-medium whitespace-nowrap">
            {{ formatearFecha(fila.fecha) }}
          </th>
          <td class="min-w-40 px-3 py-2">
            {{ fila.cuenta }}
            <span class="block text-xs text-tierra-500">Nota N.º {{ formatearTexto(fila.numero) }}</span>
          </td>
          <td class="min-w-32 px-3 py-2">{{ formatearTexto(fila.referencia) }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(fila.monto) }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(fila.aplicado) }}</td>
          <td class="px-3 py-2 text-right font-semibold tabular-nums">{{ formatearMonto(fila.disponible) }}</td>
          <td class="px-3 py-2 whitespace-nowrap">{{ textoDeDiasSinAplicar(fila.diasSinAplicar) }}</td>
          <td class="px-3 py-2 whitespace-nowrap">
            <InsigniaBase :tono="fila.conciliada ? 'campo' : 'tierra'">{{
              textoDeConciliada(fila.conciliada)
            }}</InsigniaBase>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
