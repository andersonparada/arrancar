<script setup lang="ts">
import { computed } from 'vue';
import { TriangleAlert } from 'lucide-vue-next';
import { formatearMonto, formatearTexto } from '@/modulos/core/utilidades/formato';
import { ordenarPorCredito, resumenDeDocumentos } from '../../composables/sat-2237/datos-del-sat-2237';
import type { DetalleDeProveedores } from '../../servicios/sat-2237.api';

/** Proveedores (o vendedores de facturas especiales) por crédito fiscal, con el aviso del neto en cero o negativo. */
const props = defineProps<{ detalle: DetalleDeProveedores; etiqueta: string; vacio: string }>();
const filas = computed(() => ordenarPorCredito(props.detalle.filas));
</script>

<template>
  <p
    v-if="filas.length === 0"
    class="rounded-2xl bg-tierra-100 p-4 text-sm text-tierra-700 dark:bg-tierra-800 dark:text-tierra-200"
  >
    {{ vacio }}
  </p>
  <div
    v-else
    class="max-w-full overflow-x-auto rounded-2xl bg-white ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700"
    role="region"
    :aria-label="etiqueta"
    tabindex="0"
  >
    <table class="w-full border-collapse text-sm">
      <thead class="bg-tierra-100 text-left text-xs uppercase text-tierra-700 dark:bg-tierra-800 dark:text-tierra-200">
        <tr>
          <th scope="col" class="px-3 py-2 font-semibold">NIT</th>
          <th scope="col" class="px-3 py-2 font-semibold">Nombre</th>
          <th scope="col" class="px-3 py-2 font-semibold">Documentos</th>
          <th scope="col" class="px-3 py-2 text-right font-semibold">Base</th>
          <th scope="col" class="px-3 py-2 text-right font-semibold">Crédito</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
        <tr v-for="(fila, indice) in filas" :key="`${fila.nit}-${indice}`">
          <td class="whitespace-nowrap px-3 py-2">{{ formatearTexto(fila.nit) }}</td>
          <td class="min-w-48 px-3 py-2">
            {{ fila.nombre }}
            <span
              v-if="fila.aviso"
              class="mt-1 flex items-start gap-1.5 rounded-lg bg-trigo-300/40 px-2 py-1 text-xs text-tierra-900 dark:bg-trigo-500/20 dark:text-trigo-300"
            >
              <TriangleAlert class="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {{ fila.aviso }}
            </span>
          </td>
          <td class="min-w-40 px-3 py-2 text-tierra-700 dark:text-tierra-200">{{ resumenDeDocumentos(fila) }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(fila.base) }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(fila.credito) }}</td>
        </tr>
      </tbody>
      <tfoot class="bg-tierra-100 font-semibold dark:bg-tierra-800">
        <tr>
          <th scope="row" colspan="2" class="px-3 py-2 text-left">Total</th>
          <td class="px-3 py-2">{{ detalle.total.cantidadDeFacturas }} facturas</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(detalle.total.base) }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(detalle.total.credito) }}</td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>
