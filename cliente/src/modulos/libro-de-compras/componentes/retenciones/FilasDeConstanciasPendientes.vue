<script setup lang="ts">
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { nombreDelImpuesto } from '../../composables/retenciones/datos-de-retenciones';
import type { ConstanciaPendiente } from '../../servicios/constancias-pendientes.api';
import CeldaDeDocumento from './CeldaDeDocumento.vue';
import CeldaDePlazoDeLaConstancia from './CeldaDePlazoDeLaConstancia.vue';

/** Las retenciones sin constancia de un bloque: tabla en pantallas anchas y en papel, tarjetas en el celular. */
defineProps<{ filas: ConstanciaPendiente[]; titulo: string }>();
const columnas = ['Fecha', 'Documento y proveedor', 'Impuesto', 'Base', 'Retenido', 'Plazo de la constancia'];
</script>

<template>
  <div>
    <div
      class="hidden max-w-full overflow-x-auto rounded-xl ring-1 ring-tierra-200/70 md:block print:block dark:ring-tierra-700"
    >
      <table class="w-full border-collapse text-sm">
        <caption class="sr-only">
          {{
            titulo
          }}
        </caption>
        <thead
          class="bg-tierra-100 text-left text-xs uppercase text-tierra-700 dark:bg-tierra-800 dark:text-tierra-200"
        >
          <tr>
            <th
              v-for="columna in columnas"
              :key="columna"
              scope="col"
              class="px-3 py-2 font-semibold"
              :class="columna === 'Base' || columna === 'Retenido' ? 'text-right' : ''"
            >
              {{ columna }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
          <tr v-for="fila in filas" :key="fila.retencion.id" class="align-top">
            <td class="whitespace-nowrap px-3 py-2">{{ formatearFecha(fila.retencion.fecha) }}</td>
            <td class="min-w-56 px-3 py-2"><CeldaDeDocumento :retencion="fila.retencion" /></td>
            <td class="whitespace-nowrap px-3 py-2">{{ nombreDelImpuesto(fila.retencion) }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(fila.retencion.base) }}</td>
            <td class="px-3 py-2 text-right font-semibold tabular-nums">
              {{ formatearMonto(fila.retencion.retenido) }}
            </td>
            <td class="min-w-40 px-3 py-2"><CeldaDePlazoDeLaConstancia :fila="fila" /></td>
          </tr>
        </tbody>
      </table>
    </div>

    <ul class="flex flex-col gap-2 md:hidden print:hidden">
      <li
        v-for="fila in filas"
        :key="fila.retencion.id"
        class="flex min-w-0 flex-col gap-2 rounded-xl bg-white p-3 text-sm ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700"
      >
        <CeldaDeDocumento :retencion="fila.retencion" />
        <p class="text-xs text-tierra-600 dark:text-tierra-300">
          {{ nombreDelImpuesto(fila.retencion) }} sobre {{ formatearMonto(fila.retencion.base) }} ·
          {{ formatearFecha(fila.retencion.fecha) }}
        </p>
        <p class="font-semibold tabular-nums">Retenido: {{ formatearMonto(fila.retencion.retenido) }}</p>
        <div>
          <p class="text-xs text-tierra-600 dark:text-tierra-300">Plazo de la constancia</p>
          <CeldaDePlazoDeLaConstancia :fila="fila" />
        </div>
      </li>
    </ul>
  </div>
</template>
