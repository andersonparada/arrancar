<script setup lang="ts">
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { COLUMNAS_DE_TRAMOS, tieneFichas, tramosDe } from '../../composables/reportes/bloques-de-saldos';
import type { CifrasDeSaldo, FilaDeSaldo } from '../../servicios/tipos-de-reportes';
import FilaDeTablaDeSaldo from './FilaDeTablaDeSaldo.vue';

/** La tabla de un bloque (acreedores o deudores) con su total al pie; se desliza dentro de su tarjeta, no la página. */
defineProps<{ filas: FilaDeSaldo[]; totales: CifrasDeSaldo; corte: string; titulo: string }>();
</script>

<template>
  <div
    class="overflow-x-auto rounded-2xl bg-white ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700 print:overflow-visible print:ring-0"
  >
    <table class="w-full text-sm print:text-[9px]">
      <caption class="sr-only">
        {{
          titulo
        }}
      </caption>
      <thead class="border-b border-tierra-100 text-xs text-tierra-500 dark:border-tierra-700 dark:text-tierra-300">
        <tr>
          <th scope="col" class="px-3 py-2 text-left font-medium">Proveedor</th>
          <th
            v-for="tramo in COLUMNAS_DE_TRAMOS"
            :key="tramo.clave"
            scope="col"
            class="px-3 py-2 text-right font-medium"
          >
            {{ tramo.etiqueta }}
          </th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Total cargos</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Saldos a favor</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Saldo neto</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Comprometido</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Disponible para pagar</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Sin autorizar</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
        <template v-for="fila in filas" :key="fila.nit ?? fila.proveedorId ?? fila.nombre">
          <FilaDeTablaDeSaldo :fila="fila" :corte="corte" />
          <template v-if="tieneFichas(fila)">
            <FilaDeTablaDeSaldo
              v-for="ficha in fila.fichas"
              :key="ficha.proveedorId ?? ficha.nombre"
              :fila="ficha"
              :corte="corte"
              ficha
            />
          </template>
        </template>
      </tbody>
      <tfoot class="border-t-2 border-tierra-200 font-semibold dark:border-tierra-600">
        <tr>
          <th scope="row" class="px-3 py-2 text-left">Total</th>
          <td v-for="tramo in tramosDe(totales)" :key="tramo.clave" class="px-3 py-2 text-right tabular-nums">
            {{ formatearMonto(tramo.monto) }}
          </td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(totales.totalCargos) }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(totales.saldosAFavor) }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(totales.saldoNeto) }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(totales.comprometido) }}</td>
          <td class="px-3 py-2 text-right tabular-nums">
            {{ totales.disponible === null ? '—' : formatearMonto(totales.disponible) }}
          </td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(totales.sinAutorizar) }}</td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>
