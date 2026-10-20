<script setup lang="ts">
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { etiquetaDelMes, nombreDelCombustible } from '../../composables/analisis/datos-del-analisis';
import type { ResultadosDelAnalisis } from '../../servicios/analisis.api';
import { VENTANA_DEL_ANALISIS as textos } from '../../textos-del-analisis';
import ContenedorDeTabla from './ContenedorDeTabla.vue';

/** Combustibles e IDP: un bloque por combustible, mes a mes, con los meses de IVA exento por decreto marcados. */
defineProps<{ datos: ResultadosDelAnalisis['combustibles'] }>();

const columnas = [
  { clave: 'galones', titulo: 'Galones' },
  { clave: 'idp', titulo: 'IDP' },
  { clave: 'base', titulo: 'Base' },
  { clave: 'iva', titulo: 'IVA' },
  { clave: 'exentoYNoAfecto', titulo: 'Exento y no afecto' },
] as const;
const dinero = (clave: string, valor: string) => (clave === 'galones' ? valor : formatearMonto(valor));
</script>

<template>
  <div class="space-y-6">
    <section v-for="grupo in datos.combustibles" :key="grupo.combustible ?? 'sin-combustible'">
      <h3 class="mb-2 text-base font-semibold">{{ nombreDelCombustible(grupo.combustible) }}</h3>
      <ContenedorDeTabla :etiqueta="`Combustible: ${nombreDelCombustible(grupo.combustible)}`">
        <table class="w-full min-w-max border-collapse text-sm">
          <thead
            class="bg-tierra-100 text-left text-xs uppercase text-tierra-700 dark:bg-tierra-800 dark:text-tierra-200"
          >
            <tr>
              <th scope="col" class="px-3 py-2 font-semibold">Mes</th>
              <th v-for="c in columnas" :key="c.clave" scope="col" class="px-3 py-2 text-right font-semibold">
                {{ c.titulo }}
              </th>
              <th scope="col" class="px-3 py-2 font-semibold">Notas</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
            <tr v-for="mes in grupo.meses" :key="mes.periodo">
              <th scope="row" class="whitespace-nowrap px-3 py-2 text-left font-medium">
                {{ etiquetaDelMes(mes.periodo) }}
              </th>
              <td v-for="c in columnas" :key="c.clave" class="px-3 py-2 text-right tabular-nums">
                {{ dinero(c.clave, mes[c.clave]) }}
              </td>
              <td class="px-3 py-2">
                <span
                  v-if="mes.exentoPorDecreto"
                  class="mr-2 inline-block rounded-full bg-campo-100 px-2 py-0.5 text-xs font-semibold text-campo-900 dark:bg-campo-900 dark:text-campo-100"
                  :title="textos.decretoAyuda"
                >
                  {{ textos.decreto }}
                </span>
                <span v-if="mes.aviso" class="text-xs text-amber-800 dark:text-amber-300">{{ mes.aviso }}</span>
              </td>
            </tr>
          </tbody>
          <tfoot class="bg-tierra-50 font-semibold dark:bg-tierra-800">
            <tr>
              <th scope="row" class="px-3 py-2 text-left">{{ textos.subtotal }}</th>
              <td v-for="c in columnas" :key="c.clave" class="px-3 py-2 text-right tabular-nums">
                {{ dinero(c.clave, grupo.subtotal[c.clave]) }}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </ContenedorDeTabla>
    </section>
    <dl class="flex flex-wrap justify-end gap-x-6 gap-y-1 text-sm font-semibold" role="status">
      <div v-for="c in columnas" :key="c.clave" class="flex gap-2">
        <dt>{{ textos.total }} {{ c.titulo.toLowerCase() }}:</dt>
        <dd class="tabular-nums">{{ dinero(c.clave, datos.total[c.clave]) }}</dd>
      </div>
    </dl>
  </div>
</template>
