<script setup lang="ts">
import { formatearMonto, formatearTexto } from '@/modulos/core/utilidades/formato';
import { esNegativo } from '../../composables/libro/datos-del-libro';
import type { ResultadosDelAnalisis } from '../../servicios/analisis.api';
import { VENTANA_DEL_ANALISIS as textos } from '../../textos-del-analisis';
import ContenedorDeTabla from './ContenedorDeTabla.vue';

/** Compras por proveedor: una fila por proveedor y el total del rango al pie. */
defineProps<{ datos: ResultadosDelAnalisis['compras-por-proveedor'] }>();

const columnas = [
  { clave: 'total', titulo: 'Total' },
  { clave: 'base', titulo: 'Base' },
  { clave: 'ivaConCredito', titulo: 'IVA con crédito' },
  { clave: 'ivaSinCredito', titulo: 'IVA sin crédito' },
  { clave: 'exentoYNoAfecto', titulo: 'Exento y no afecto' },
  { clave: 'idp', titulo: 'IDP' },
  { clave: 'retenido', titulo: 'Retenido' },
  { clave: 'neto', titulo: 'Neto a pagar' },
] as const;
</script>

<template>
  <ContenedorDeTabla etiqueta="Compras por proveedor">
    <table class="w-full min-w-max border-collapse text-sm">
      <caption class="sr-only">
        Compras por proveedor del rango. Los montos en rojo restan.
      </caption>
      <thead class="bg-tierra-100 text-left text-xs uppercase text-tierra-700 dark:bg-tierra-800 dark:text-tierra-200">
        <tr>
          <th scope="col" class="sticky left-0 bg-tierra-100 px-3 py-2 font-semibold dark:bg-tierra-800">Proveedor</th>
          <th scope="col" class="px-3 py-2 text-right font-semibold">Documentos</th>
          <th v-for="c in columnas" :key="c.clave" scope="col" class="px-3 py-2 text-right font-semibold">
            {{ c.titulo }}
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
        <tr v-for="fila in datos.filas" :key="fila.proveedorId">
          <th scope="row" class="sticky left-0 bg-white px-3 py-2 text-left font-normal dark:bg-tierra-800">
            <span class="block max-w-64 truncate font-medium" :title="fila.nombre">{{ fila.nombre }}</span>
            <span class="block text-xs text-tierra-500 dark:text-tierra-300">{{ formatearTexto(fila.nit) }}</span>
          </th>
          <td class="px-3 py-2 text-right tabular-nums">{{ fila.documentos }}</td>
          <td
            v-for="c in columnas"
            :key="c.clave"
            class="px-3 py-2 text-right tabular-nums"
            :class="{ 'text-red-700 dark:text-red-400': esNegativo(fila[c.clave]) }"
          >
            {{ formatearMonto(fila[c.clave]) }}
          </td>
        </tr>
      </tbody>
      <tfoot class="bg-tierra-50 font-semibold dark:bg-tierra-800">
        <tr>
          <th scope="row" class="sticky left-0 bg-tierra-50 px-3 py-2 text-left dark:bg-tierra-800">
            {{ textos.total }}
          </th>
          <td class="px-3 py-2 text-right tabular-nums">{{ datos.total.documentos }}</td>
          <td v-for="c in columnas" :key="c.clave" class="px-3 py-2 text-right tabular-nums">
            {{ formatearMonto(datos.total[c.clave]) }}
          </td>
        </tr>
      </tfoot>
    </table>
  </ContenedorDeTabla>
</template>
