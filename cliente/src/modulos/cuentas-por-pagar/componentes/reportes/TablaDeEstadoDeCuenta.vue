<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { montoOVacio, notaDeAnteriores, textoDeLinea, tieneFicha } from '../../composables/reportes/estado-de-cuenta';
import type { EstadoDeCuenta } from '../../servicios/tipos-de-reportes-de-proveedor';

/**
 * El estado de cuenta en tabla: saldo anterior, cada línea con su saldo corrido y los totales. En la presentación
 * interna agrega total, retenciones y neto; para el proveedor, solo cargo, abono y saldo. Se desliza dentro de su
 * tarjeta, no la página, y en papel repite el encabezado en cada hoja.
 */
const props = defineProps<{ estado: EstadoDeCuenta }>();
const interna = computed(() => props.estado.presentacion === 'interna');
const columnas = computed(() => (interna.value ? 7 : 4));
</script>

<template>
  <div
    class="overflow-x-auto rounded-2xl bg-white ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700 print:overflow-visible print:ring-0"
  >
    <table class="w-full text-sm print:text-[10px]">
      <caption class="sr-only">
        Estado de cuenta de
        {{
          estado.proveedor.nombre
        }}
      </caption>
      <thead
        class="border-b border-tierra-100 text-xs text-tierra-500 dark:border-tierra-700 dark:text-tierra-300 print:table-header-group"
      >
        <tr>
          <th scope="col" class="px-3 py-2 text-left font-medium">Fecha</th>
          <th scope="col" class="px-3 py-2 text-left font-medium">Concepto</th>
          <template v-if="interna">
            <th scope="col" class="px-3 py-2 text-right font-medium">Total</th>
            <th scope="col" class="px-3 py-2 text-right font-medium">Retenciones</th>
          </template>
          <th scope="col" class="px-3 py-2 text-right font-medium">{{ interna ? 'Cargo neto' : 'Cargo' }}</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Abono</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Saldo</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
        <tr class="bg-tierra-50 font-medium dark:bg-tierra-800">
          <td class="px-3 py-2 whitespace-nowrap">{{ formatearFecha(estado.desde) }}</td>
          <th scope="row" class="px-3 py-2 text-left font-medium" :colspan="columnas - 1">Saldo anterior</th>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(estado.totales.saldoAnterior) }}</td>
        </tr>
        <tr
          v-for="(linea, i) in estado.lineas"
          :key="i"
          class="align-top print:break-inside-avoid"
          :class="{ 'text-tierra-400 line-through dark:text-tierra-500': linea.anulada }"
        >
          <td class="px-3 py-2 whitespace-nowrap">{{ formatearFecha(linea.fecha) }}</td>
          <th scope="row" class="min-w-52 px-3 py-2 text-left font-normal">
            <RouterLink
              v-if="tieneFicha(linea)"
              :to="{ name: 'cuentas-por-pagar.documentos.ficha', params: { documentoId: linea.documentoId } }"
              class="rounded text-campo-700 hover:underline focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none dark:text-campo-300 print:text-current print:no-underline"
            >
              {{ textoDeLinea(linea) }}
            </RouterLink>
            <template v-else>{{ textoDeLinea(linea) }}</template>
            <span v-if="notaDeAnteriores(linea)" class="block text-xs text-tierra-500 no-underline">
              {{ notaDeAnteriores(linea) }}
            </span>
          </th>
          <template v-if="interna">
            <td class="px-3 py-2 text-right tabular-nums">{{ montoOVacio(linea.total) }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ montoOVacio(linea.retenciones) }}</td>
          </template>
          <td class="px-3 py-2 text-right tabular-nums">{{ montoOVacio(linea.cargo) }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ montoOVacio(linea.abono) }}</td>
          <td class="px-3 py-2 text-right font-medium tabular-nums">{{ montoOVacio(linea.saldo) }}</td>
        </tr>
      </tbody>
      <tfoot class="border-t-2 border-tierra-200 font-semibold dark:border-tierra-600">
        <tr>
          <th scope="row" class="px-3 py-2 text-left" :colspan="columnas - 3">Totales del período</th>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(estado.totales.cargos) }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(estado.totales.abonos) }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(estado.totales.saldoFinal) }}</td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>
