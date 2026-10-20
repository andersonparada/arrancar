<script setup lang="ts">
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { textoDelTipo } from '../../composables/analisis/datos-del-analisis';
import { esNegativo } from '../../composables/libro/datos-del-libro';
import type { ResultadosDelAnalisis } from '../../servicios/analisis.api';
import { VENTANA_DEL_ANALISIS as textos } from '../../textos-del-analisis';
import ContenedorDeTabla from './ContenedorDeTabla.vue';

/** Compras por concepto de gasto: base, IVA y costo real (total menos el IVA con crédito). */
defineProps<{ datos: ResultadosDelAnalisis['compras-por-concepto'] }>();

const columnas = [
  { clave: 'base', titulo: 'Base' },
  { clave: 'ivaConCredito', titulo: 'IVA con crédito' },
  { clave: 'ivaAlCosto', titulo: 'IVA al costo' },
  { clave: 'costo', titulo: 'Costo' },
] as const;
</script>

<template>
  <ContenedorDeTabla etiqueta="Compras por concepto">
    <table class="w-full min-w-max border-collapse text-sm">
      <caption class="sr-only">
        Compras por concepto del rango. El costo incluye el IVA que no se pudo acreditar.
      </caption>
      <thead class="bg-tierra-100 text-left text-xs uppercase text-tierra-700 dark:bg-tierra-800 dark:text-tierra-200">
        <tr>
          <th scope="col" class="sticky left-0 bg-tierra-100 px-3 py-2 font-semibold dark:bg-tierra-800">Concepto</th>
          <th scope="col" class="px-3 py-2 font-semibold">Tipo</th>
          <th scope="col" class="px-3 py-2 text-right font-semibold">Líneas</th>
          <th v-for="c in columnas" :key="c.clave" scope="col" class="px-3 py-2 text-right font-semibold">
            {{ c.titulo }}
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
        <tr v-for="fila in datos.filas" :key="fila.conceptoId">
          <th scope="row" class="sticky left-0 bg-white px-3 py-2 text-left font-medium dark:bg-tierra-800">
            {{ fila.concepto }}
          </th>
          <td class="px-3 py-2">{{ textoDelTipo(fila.tipo) }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ fila.lineas }}</td>
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
          <td />
          <td class="px-3 py-2 text-right tabular-nums">{{ datos.total.lineas }}</td>
          <td v-for="c in columnas" :key="c.clave" class="px-3 py-2 text-right tabular-nums">
            {{ formatearMonto(datos.total[c.clave]) }}
          </td>
        </tr>
      </tfoot>
    </table>
  </ContenedorDeTabla>
</template>
