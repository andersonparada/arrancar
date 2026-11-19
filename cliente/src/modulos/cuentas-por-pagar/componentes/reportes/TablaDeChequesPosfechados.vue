<script setup lang="ts">
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { formatearFecha, formatearMonto, formatearTexto } from '@/modulos/core/utilidades/formato';
import { textoDeCobro, textoDeDiasQueFaltan } from '../../composables/reportes/cheques-posfechados';
import type { FilaDeChequePosfechado } from '../../servicios/tipos-de-reportes-de-pagos';
import EnlaceDeProveedorDelReporte from './EnlaceDeProveedorDelReporte.vue';

/** Los cheques posfechados en tabla; se desliza dentro de su tarjeta, no la página. */
defineProps<{ filas: FilaDeChequePosfechado[] }>();
</script>

<template>
  <div
    class="overflow-x-auto rounded-2xl bg-white ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700 print:overflow-visible print:ring-0"
  >
    <table class="w-full text-sm print:text-[10px]">
      <caption class="sr-only">
        Cheques posfechados al corte
      </caption>
      <thead
        class="border-b border-tierra-100 text-xs text-tierra-500 dark:border-tierra-700 dark:text-tierra-300 print:table-header-group"
      >
        <tr>
          <th scope="col" class="px-3 py-2 text-left font-medium">Fecha del cheque</th>
          <th scope="col" class="px-3 py-2 text-left font-medium">Faltan</th>
          <th scope="col" class="px-3 py-2 text-left font-medium">Cuenta y cheque</th>
          <th scope="col" class="px-3 py-2 text-left font-medium">Proveedor</th>
          <th scope="col" class="px-3 py-2 text-left font-medium">Pago</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Monto</th>
          <th scope="col" class="px-3 py-2 text-left font-medium">Cobrado</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
        <tr v-for="fila in filas" :key="fila.pagoId" class="align-top print:break-inside-avoid">
          <th scope="row" class="px-3 py-2 text-left font-medium whitespace-nowrap">
            {{ formatearFecha(fila.fecha) }}
          </th>
          <td class="px-3 py-2 whitespace-nowrap">{{ textoDeDiasQueFaltan(fila.diasQueFaltan) }}</td>
          <td class="px-3 py-2">
            {{ formatearTexto(fila.cuenta) }}
            <span class="block text-xs text-tierra-500">Cheque {{ formatearTexto(fila.numeroDeCheque) }}</span>
          </td>
          <td class="min-w-40 px-3 py-2">
            <EnlaceDeProveedorDelReporte :id="fila.proveedorId" :nombre="fila.proveedorNombre" />
          </td>
          <td class="px-3 py-2 whitespace-nowrap">N.º {{ fila.numeroDelPago }}</td>
          <td class="px-3 py-2 text-right font-semibold tabular-nums">{{ formatearMonto(fila.monto) }}</td>
          <td class="px-3 py-2 whitespace-nowrap">
            <InsigniaBase :tono="fila.cobrado ? 'trigo' : 'tierra'">{{ textoDeCobro(fila) }}</InsigniaBase>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
