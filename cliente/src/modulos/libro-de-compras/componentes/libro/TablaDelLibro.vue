<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { formatearFecha, formatearMonto, formatearTexto } from '@/modulos/core/utilidades/formato';
import {
  columnasDelLibro,
  esNegativo,
  nombreDelTipoDte,
  numeroDeDocumento,
  type ColumnaDelLibro,
} from '../../composables/libro/datos-del-libro';
import type { ColumnaDeDinero, FilaDelLibro, LibroDelPeriodo } from '../../servicios/libro.api';

const props = defineProps<{ libro: LibroDelPeriodo }>();

const columnas = computed(() => columnasDelLibro(props.libro.tipoDeLibro));
const columnasDeTexto = computed(() => columnas.value.filter((columna) => !columna.dinero).length);
const descripcionDeSigla = computed(() => new Map(props.libro.leyenda.map((e) => [e.sigla, e.descripcion])));

const monto = (fila: FilaDelLibro, columna: ColumnaDelLibro) => fila[columna.clave as ColumnaDeDinero];
const textoDe = (fila: FilaDelLibro, clave: string): string =>
  clave === 'fecha' ? formatearFecha(fila.fecha) : formatearTexto(fila[clave as 'nit' | 'nombre'] ?? null);
const rojo = (fila: FilaDelLibro) => (esNegativo(fila.total) ? 'text-red-700 dark:text-red-400' : '');
</script>

<template>
  <!-- La tabla se desplaza dentro de su contenedor: la página nunca se desborda en el celular. -->
  <div
    class="max-w-full overflow-x-auto rounded-2xl bg-white ring-1 ring-tierra-200/70 focus-visible:outline-2 dark:bg-tierra-800/60 dark:ring-tierra-700"
    role="region"
    :aria-label="`Libro de compras de ${libro.periodo}`"
    tabindex="0"
  >
    <table class="w-full min-w-max border-collapse text-sm">
      <caption class="sr-only">
        Compras del período
        {{
          libro.periodo
        }}. Las filas en rojo restan: son notas de crédito.
      </caption>
      <thead class="bg-tierra-100 text-left text-xs uppercase text-tierra-700 dark:bg-tierra-800 dark:text-tierra-200">
        <tr>
          <th
            v-for="columna in columnas"
            :key="columna.clave"
            scope="col"
            class="px-3 py-2 font-semibold"
            :class="columna.dinero ? 'text-right' : ''"
          >
            {{ columna.titulo }}
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
        <tr v-for="fila in libro.filas" :key="fila.documentoId" :class="rojo(fila)">
          <template v-for="columna in columnas" :key="columna.clave">
            <td v-if="columna.dinero" class="px-3 py-2 text-right tabular-nums">
              {{ formatearMonto(monto(fila, columna)) }}
            </td>
            <td v-else-if="columna.clave === 'numeroDeFila'" class="px-3 py-2 tabular-nums">
              {{ fila.numeroDeFila }}
            </td>
            <td v-else-if="columna.clave === 'tipoDte'" class="px-3 py-2">
              <abbr :title="nombreDelTipoDte(fila.tipoDte)" class="no-underline">{{ fila.tipoDte ?? '—' }}</abbr>
            </td>
            <td v-else-if="columna.clave === 'documento'" class="whitespace-nowrap px-3 py-2">
              <RouterLink
                :to="{ name: 'libro-de-compras.documentos.ficha', params: { documentoId: fila.documentoId } }"
                class="font-medium underline underline-offset-2 hover:text-campo-700 dark:hover:text-campo-300"
                :aria-label="`Ver el documento ${numeroDeDocumento(fila)}`"
              >
                {{ numeroDeDocumento(fila) }}
              </RouterLink>
            </td>
            <td v-else-if="columna.clave === 'siglaDelMotivo'" class="px-3 py-2">
              <abbr
                v-if="fila.siglaDelMotivo"
                :title="descripcionDeSigla.get(fila.siglaDelMotivo)"
                class="cursor-help no-underline"
                >{{ fila.siglaDelMotivo }}</abbr
              >
            </td>
            <td v-else class="px-3 py-2" :class="columna.clave === 'nombre' ? 'min-w-48' : 'whitespace-nowrap'">
              {{ textoDe(fila, columna.clave) }}
            </td>
          </template>
        </tr>
      </tbody>
      <tfoot class="border-t-2 border-tierra-300 bg-tierra-50 font-semibold dark:border-tierra-600 dark:bg-tierra-800">
        <tr>
          <th scope="row" :colspan="columnasDeTexto" class="px-3 py-2 text-left">
            Totales del período ({{ libro.filas.length }} {{ libro.filas.length === 1 ? 'fila' : 'filas' }})
          </th>
          <td
            v-for="columna in columnas.filter((c) => c.dinero)"
            :key="columna.clave"
            class="px-3 py-2 text-right tabular-nums"
            :class="
              esNegativo(libro.resumen.totales[columna.clave as ColumnaDeDinero])
                ? 'text-red-700 dark:text-red-400'
                : ''
            "
          >
            {{ formatearMonto(libro.resumen.totales[columna.clave as ColumnaDeDinero]) }}
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>
