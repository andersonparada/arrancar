<script setup lang="ts">
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { etiquetaDelIva, textoDeRubrosDeLaCasilla } from '../../composables/sat-2237/datos-del-sat-2237';
import type { CasillaDelSat2237, RubroDelSat2237 } from '../../servicios/sat-2237.api';
import { VENTANA_DEL_SAT_2237 as textos } from '../../textos-del-sat-2237';

/** Las casillas de la sección 5: lo que suman, la base y el IVA (con crédito o al costo). */
defineProps<{ casillas: CasillaDelSat2237[]; rubros: RubroDelSat2237[] }>();
</script>

<template>
  <div
    class="max-w-full overflow-x-auto rounded-2xl bg-white ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700"
    role="region"
    aria-label="Sección 5 del SAT-2237"
    tabindex="0"
  >
    <table class="w-full border-collapse text-sm">
      <thead class="bg-tierra-100 text-left text-xs uppercase text-tierra-700 dark:bg-tierra-800 dark:text-tierra-200">
        <tr>
          <th scope="col" class="px-3 py-2 font-semibold">{{ textos.casilla }}</th>
          <th scope="col" class="px-3 py-2 font-semibold">{{ textos.rubrosQueSuman }}</th>
          <th scope="col" class="px-3 py-2 text-right font-semibold">Base</th>
          <th scope="col" class="px-3 py-2 text-right font-semibold">IVA</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
        <tr v-for="casilla in casillas" :key="casilla.clave">
          <th scope="row" class="min-w-52 px-3 py-2 text-left font-medium">{{ casilla.nombre }}</th>
          <td class="min-w-48 px-3 py-2 text-tierra-700 dark:text-tierra-200">
            <template v-if="casilla.llenaLaSat">{{ textos.llenaLaSat }}</template>
            <template v-else>{{ textoDeRubrosDeLaCasilla(casilla, rubros) }}</template>
          </td>
          <template v-if="casilla.llenaLaSat">
            <td class="px-3 py-2 text-right text-tierra-500" colspan="2">—</td>
          </template>
          <template v-else>
            <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(casilla.neto.base) }}</td>
            <td class="px-3 py-2 text-right tabular-nums">
              {{ formatearMonto(casilla.neto.iva) }}
              <span class="block text-xs text-tierra-600 dark:text-tierra-300">{{ etiquetaDelIva(casilla) }}</span>
            </td>
          </template>
        </tr>
      </tbody>
    </table>
  </div>
</template>
