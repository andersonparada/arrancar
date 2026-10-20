<script setup lang="ts">
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { textosDelMotivo } from '../../composables/analisis/datos-del-analisis';
import { esNegativo, nombreDelTipoDte } from '../../composables/libro/datos-del-libro';
import type { ResultadosDelAnalisis } from '../../servicios/analisis.api';
import { VENTANA_DEL_ANALISIS as textos } from '../../textos-del-analisis';
import ContenedorDeTabla from './ContenedorDeTabla.vue';
import EnlaceDelDocumento from './EnlaceDelDocumento.vue';

/** IVA al costo: un bloque por motivo, con su explicación, sus líneas y su subtotal. */
defineProps<{ datos: ResultadosDelAnalisis['iva-al-costo'] }>();
</script>

<template>
  <div class="space-y-6">
    <section v-for="grupo in datos.motivos" :key="grupo.motivo ?? 'sin-motivo'">
      <h3 class="text-base font-semibold">{{ textosDelMotivo(grupo.motivo).titulo }}</h3>
      <p v-if="textosDelMotivo(grupo.motivo).explicacion" class="mb-2 text-sm text-tierra-600 dark:text-tierra-300">
        {{ textosDelMotivo(grupo.motivo).explicacion }}
      </p>
      <ContenedorDeTabla :etiqueta="`IVA al costo: ${textosDelMotivo(grupo.motivo).titulo}`">
        <table class="w-full min-w-max border-collapse text-sm">
          <thead
            class="bg-tierra-100 text-left text-xs uppercase text-tierra-700 dark:bg-tierra-800 dark:text-tierra-200"
          >
            <tr>
              <th scope="col" class="px-3 py-2 font-semibold">Fecha</th>
              <th scope="col" class="px-3 py-2 font-semibold">Tipo</th>
              <th scope="col" class="px-3 py-2 font-semibold">Documento</th>
              <th scope="col" class="px-3 py-2 font-semibold">Proveedor</th>
              <th scope="col" class="px-3 py-2 text-right font-semibold">Línea</th>
              <th scope="col" class="px-3 py-2 font-semibold">Concepto</th>
              <th scope="col" class="px-3 py-2 text-right font-semibold">IVA al costo</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
            <tr v-for="linea in grupo.lineas" :key="`${linea.documentoId}-${linea.numeroDeLinea}`">
              <td class="whitespace-nowrap px-3 py-2">{{ formatearFecha(linea.fecha) }}</td>
              <td class="px-3 py-2">
                <abbr :title="nombreDelTipoDte(linea.tipoDte)" class="no-underline">{{ linea.tipoDte ?? '—' }}</abbr>
              </td>
              <td class="px-3 py-2"><EnlaceDelDocumento :documento="linea" /></td>
              <td class="px-3 py-2">
                <span class="block max-w-64 truncate" :title="linea.proveedor">{{ linea.proveedor }}</span>
                <span class="block text-xs text-tierra-500 dark:text-tierra-300">{{
                  linea.nitDelProveedor ?? '—'
                }}</span>
              </td>
              <td class="px-3 py-2 text-right tabular-nums">{{ linea.numeroDeLinea }}</td>
              <td class="px-3 py-2">{{ linea.concepto }}</td>
              <td
                class="px-3 py-2 text-right tabular-nums"
                :class="{ 'text-red-700 dark:text-red-400': esNegativo(linea.ivaAlCosto) }"
              >
                {{ formatearMonto(linea.ivaAlCosto) }}
              </td>
            </tr>
          </tbody>
          <tfoot class="bg-tierra-50 font-semibold dark:bg-tierra-800">
            <tr>
              <th scope="row" colspan="6" class="px-3 py-2 text-left">{{ textos.subtotal }}</th>
              <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(grupo.subtotal) }}</td>
            </tr>
          </tfoot>
        </table>
      </ContenedorDeTabla>
    </section>
    <p class="text-right text-sm font-semibold" role="status">
      {{ textos.total }}: <span class="tabular-nums">{{ formatearMonto(datos.total) }}</span>
    </p>
  </div>
</template>
