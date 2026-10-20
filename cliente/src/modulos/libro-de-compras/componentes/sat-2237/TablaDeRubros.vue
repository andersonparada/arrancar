<script setup lang="ts">
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { rubroSinMovimiento } from '../../composables/sat-2237/datos-del-sat-2237';
import { esNegativo } from '../../composables/libro/datos-del-libro';
import type { RubroDelSat2237 } from '../../servicios/sat-2237.api';

/** Los rubros del formulario: base e IVA de facturas, notas de débito, notas de crédito (en negativo) y neto. */
defineProps<{ rubros: RubroDelSat2237[] }>();

const grupos = [
  { clave: 'facturas', titulo: 'Facturas' },
  { clave: 'notasDeDebito', titulo: 'Notas de débito' },
  { clave: 'notasDeCredito', titulo: 'Notas de crédito' },
  { clave: 'neto', titulo: 'Neto' },
] as const;
const clasesDeNumero = 'px-3 py-2 text-right tabular-nums';
</script>

<template>
  <div
    class="max-w-full overflow-x-auto rounded-2xl bg-white ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700"
    role="region"
    aria-label="Rubros del SAT-2237"
    tabindex="0"
  >
    <table class="w-full min-w-max border-collapse text-sm">
      <thead class="bg-tierra-100 text-xs uppercase text-tierra-700 dark:bg-tierra-800 dark:text-tierra-200">
        <tr>
          <th scope="col" rowspan="2" class="px-3 py-2 text-left font-semibold">Rubro</th>
          <th v-for="grupo in grupos" :key="grupo.clave" scope="colgroup" colspan="2" class="px-3 pt-2 text-center">
            {{ grupo.titulo }}
          </th>
        </tr>
        <tr>
          <template v-for="grupo in grupos" :key="grupo.clave">
            <th scope="col" class="px-3 pb-2 text-right font-medium">Base</th>
            <th scope="col" class="px-3 pb-2 text-right font-medium">IVA</th>
          </template>
        </tr>
      </thead>
      <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
        <tr
          v-for="rubro in rubros"
          :key="rubro.clave"
          :class="{ 'text-tierra-500 dark:text-tierra-400': rubroSinMovimiento(rubro) }"
        >
          <th scope="row" class="min-w-52 px-3 py-2 text-left font-medium">
            {{ rubro.nombre }}
            <span v-if="rubro.nota" class="block max-w-xs text-xs font-normal text-tierra-600 dark:text-tierra-300">{{
              rubro.nota
            }}</span>
          </th>
          <template v-for="grupo in grupos" :key="grupo.clave">
            <td :class="[clasesDeNumero, { 'text-red-700 dark:text-red-300': esNegativo(rubro[grupo.clave].base) }]">
              {{ formatearMonto(rubro[grupo.clave].base) }}
            </td>
            <td :class="[clasesDeNumero, { 'text-red-700 dark:text-red-300': esNegativo(rubro[grupo.clave].iva) }]">
              {{ formatearMonto(rubro[grupo.clave].iva) }}
            </td>
          </template>
        </tr>
      </tbody>
    </table>
  </div>
</template>
