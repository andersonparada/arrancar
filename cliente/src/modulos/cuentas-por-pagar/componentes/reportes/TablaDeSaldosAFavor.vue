<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import {
  TEXTOS_DE_TRAMO_DE_PRESCRIPCION,
  textoDeAntiguedad,
  tituloDeLaNota,
} from '../../composables/reportes/saldos-a-favor';
import type { FilaDeSaldoAFavor } from '../../servicios/tipos-de-reportes-de-proveedor';

/** Las notas con saldo a favor en tabla; se desliza dentro de su tarjeta, no la página. */
defineProps<{ filas: FilaDeSaldoAFavor[]; titulo: string }>();
</script>

<template>
  <div
    class="overflow-x-auto rounded-2xl bg-white ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700 print:overflow-visible print:ring-0"
  >
    <table class="w-full text-sm print:text-[10px]">
      <caption class="sr-only">
        {{
          titulo
        }}
      </caption>
      <thead
        class="border-b border-tierra-100 text-xs text-tierra-500 dark:border-tierra-700 dark:text-tierra-300 print:table-header-group"
      >
        <tr>
          <th scope="col" class="px-3 py-2 text-left font-medium">Nota</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Emisión</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Valor</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Saldo a favor</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Último movimiento</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Antigüedad</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Tramo</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Posible prescripción desde</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
        <tr v-for="fila in filas" :key="fila.id" class="align-top print:break-inside-avoid">
          <th scope="row" class="min-w-44 px-3 py-2 text-left font-normal">
            <RouterLink
              :to="{ name: 'cuentas-por-pagar.documentos.ficha', params: { documentoId: fila.id } }"
              class="rounded font-medium text-campo-700 hover:underline focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none dark:text-campo-300 print:text-current print:no-underline"
            >
              {{ tituloDeLaNota(fila) }}
            </RouterLink>
            <span class="block text-xs text-tierra-600 dark:text-tierra-300">{{ fila.proveedorNombre }}</span>
            <span v-if="fila.enContrasena" class="block text-xs text-tierra-500">En una contraseña de pago</span>
          </th>
          <td class="px-3 py-2 text-right whitespace-nowrap">{{ formatearFecha(fila.fechaEmision) }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(fila.base) }}</td>
          <td class="px-3 py-2 text-right font-semibold tabular-nums">{{ formatearMonto(fila.saldoLibre) }}</td>
          <td class="px-3 py-2 text-right whitespace-nowrap">{{ formatearFecha(fila.ultimoMovimiento) }}</td>
          <td class="px-3 py-2 text-right whitespace-nowrap">{{ textoDeAntiguedad(fila) }}</td>
          <td class="px-3 py-2 text-right whitespace-nowrap">{{ TEXTOS_DE_TRAMO_DE_PRESCRIPCION[fila.tramo] }}</td>
          <td class="px-3 py-2 text-right whitespace-nowrap">{{ formatearFecha(fila.posiblePrescripcionDesde) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
