<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { textoDeAtraso } from '../../composables/reportes/contrasenas-por-pagar';
import type { FilaDeContrasenaPorPagar } from '../../servicios/tipos-de-reportes-de-proveedor';

/** Las contraseñas con pago prometido vencido en tabla; se desliza dentro de su tarjeta, no la página. */
defineProps<{ filas: FilaDeContrasenaPorPagar[] }>();
</script>

<template>
  <div
    class="overflow-x-auto rounded-2xl bg-white ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700 print:overflow-visible print:ring-0"
  >
    <table class="w-full text-sm print:text-[10px]">
      <caption class="sr-only">
        Contraseñas con pago prometido vencido
      </caption>
      <thead
        class="border-b border-tierra-100 text-xs text-tierra-500 dark:border-tierra-700 dark:text-tierra-300 print:table-header-group"
      >
        <tr>
          <th scope="col" class="px-3 py-2 text-left font-medium">Contraseña</th>
          <th scope="col" class="px-3 py-2 text-left font-medium">Proveedor</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Pago prometido</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Atraso</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Documentos</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Saldo</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Autorizado</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Sin autorizar</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Comprometido</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
        <tr v-for="fila in filas" :key="fila.id" class="align-top print:break-inside-avoid">
          <th scope="row" class="px-3 py-2 text-left font-normal">
            <RouterLink
              :to="{ name: 'cuentas-por-pagar.contrasenas.ficha', params: { id: fila.id } }"
              class="rounded font-medium text-campo-700 hover:underline focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none dark:text-campo-300 print:text-current print:no-underline"
            >
              N.º {{ fila.numero }}
            </RouterLink>
            <span class="block text-xs text-tierra-500">{{ formatearFecha(fila.fecha) }}</span>
          </th>
          <td class="min-w-40 px-3 py-2">{{ fila.proveedorNombre }}</td>
          <td class="px-3 py-2 text-right whitespace-nowrap">{{ formatearFecha(fila.pagoPrometido) }}</td>
          <td
            class="px-3 py-2 text-right whitespace-nowrap"
            :class="{ 'font-medium text-red-700 dark:text-red-300': fila.diasDeAtraso > 0 }"
          >
            {{ textoDeAtraso(fila.diasDeAtraso) }}
          </td>
          <td class="px-3 py-2 text-right tabular-nums">{{ fila.documentosConSaldo }}</td>
          <td class="px-3 py-2 text-right font-semibold tabular-nums">{{ formatearMonto(fila.saldo) }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(fila.autorizado) }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(fila.sinAutorizar) }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(fila.comprometido) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
