<script setup lang="ts">
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { textoDeDocumentos, tiposDeLaOperacion } from '../../composables/sat-2237/datos-del-sat-2237';
import type { OperacionDelSegmento9 } from '../../servicios/sat-2237.api';

/** Las operaciones del segmento 9: cuántos documentos y qué base hay de cada tipo. */
defineProps<{ operaciones: OperacionDelSegmento9[] }>();
</script>

<template>
  <div
    class="max-w-full overflow-x-auto rounded-2xl bg-white ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700"
    role="region"
    aria-label="Segmento 9 del SAT-2237"
    tabindex="0"
  >
    <table class="w-full border-collapse text-sm">
      <thead class="bg-tierra-100 text-left text-xs uppercase text-tierra-700 dark:bg-tierra-800 dark:text-tierra-200">
        <tr>
          <th scope="col" class="px-3 py-2 font-semibold">Operación</th>
          <th scope="col" class="px-3 py-2 font-semibold">Tipos DTE</th>
          <th scope="col" class="px-3 py-2 text-right font-semibold">Documentos</th>
          <th scope="col" class="px-3 py-2 text-right font-semibold">Base</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
        <tr v-for="operacion in operaciones" :key="operacion.clave">
          <th scope="row" class="min-w-40 px-3 py-2 text-left font-medium">{{ operacion.nombre }}</th>
          <td class="px-3 py-2">{{ tiposDeLaOperacion(operacion) }}</td>
          <td class="whitespace-nowrap px-3 py-2 text-right tabular-nums">
            {{ textoDeDocumentos(operacion.cantidad) }}
          </td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(operacion.base) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
