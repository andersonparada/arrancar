<script setup lang="ts">
import { formatearFecha, formatearMonto, formatearTexto } from '@/modulos/core/utilidades/formato';
import { esNegativo, nombreDelTipoDte } from '../../composables/libro/datos-del-libro';
import type { ResultadosDelAnalisis } from '../../servicios/analisis.api';
import { VENTANA_DEL_ANALISIS as textos } from '../../textos-del-analisis';
import ContenedorDeTabla from './ContenedorDeTabla.vue';
import EnlaceDelDocumento from './EnlaceDelDocumento.vue';

/** Activos fijos comprados en el rango: una fila por línea marcada como activo fijo. */
defineProps<{ datos: ResultadosDelAnalisis['activos-fijos'] }>();
</script>

<template>
  <ContenedorDeTabla etiqueta="Activos fijos comprados">
    <table class="w-full min-w-max border-collapse text-sm">
      <thead class="bg-tierra-100 text-left text-xs uppercase text-tierra-700 dark:bg-tierra-800 dark:text-tierra-200">
        <tr>
          <th scope="col" class="px-3 py-2 font-semibold">Fecha</th>
          <th scope="col" class="px-3 py-2 font-semibold">Tipo</th>
          <th scope="col" class="px-3 py-2 font-semibold">Documento</th>
          <th scope="col" class="px-3 py-2 font-semibold">Proveedor</th>
          <th scope="col" class="px-3 py-2 font-semibold">Concepto</th>
          <th scope="col" class="px-3 py-2 font-semibold">Descripción</th>
          <th scope="col" class="px-3 py-2 text-right font-semibold">Costo</th>
          <th scope="col" class="px-3 py-2 text-right font-semibold">IVA con crédito</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
        <tr v-for="fila in datos.filas" :key="`${fila.documentoId}-${fila.numeroDeLinea}`">
          <td class="whitespace-nowrap px-3 py-2">{{ formatearFecha(fila.fecha) }}</td>
          <td class="px-3 py-2">
            <abbr :title="nombreDelTipoDte(fila.tipoDte)" class="no-underline">{{ fila.tipoDte ?? '—' }}</abbr>
          </td>
          <td class="px-3 py-2"><EnlaceDelDocumento :documento="fila" /></td>
          <td class="px-3 py-2">
            <span class="block max-w-64 truncate" :title="fila.proveedor">{{ fila.proveedor }}</span>
            <span class="block text-xs text-tierra-500 dark:text-tierra-300">{{ fila.nitDelProveedor ?? '—' }}</span>
          </td>
          <td class="px-3 py-2">{{ fila.concepto }}</td>
          <td class="px-3 py-2">{{ formatearTexto(fila.descripcion) }}</td>
          <td
            class="px-3 py-2 text-right tabular-nums"
            :class="{ 'text-red-700 dark:text-red-400': esNegativo(fila.costo) }"
          >
            {{ formatearMonto(fila.costo) }}
          </td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(fila.ivaConCredito) }}</td>
        </tr>
      </tbody>
      <tfoot class="bg-tierra-50 font-semibold dark:bg-tierra-800">
        <tr>
          <th scope="row" colspan="6" class="px-3 py-2 text-left">{{ textos.total }}</th>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(datos.total.costo) }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(datos.total.ivaConCredito) }}</td>
        </tr>
      </tfoot>
    </table>
  </ContenedorDeTabla>
</template>
