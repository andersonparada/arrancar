<script setup lang="ts">
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { nombreDelMes } from '../../composables/retenciones/datos-de-pagos';
import { GRUPOS_EN_ORDEN, tonoDelEstado } from '../../composables/retenciones/datos-de-retenciones';
import type { GrupoDeEntero, MatrizDeEnteros } from '../../servicios/retenciones.api';
import { NOMBRES_CORTOS_DE_GRUPOS, NOMBRES_DE_ESTADOS } from '../../textos-de-retenciones';

/** El año completo: cada mes con sus cuatro grupos, su estado y lo pagado de lo retenido. Tocar una celda abre sus pagos. */
defineProps<{ matriz: MatrizDeEnteros }>();
defineEmits<{ abrir: [mes: string, grupo: GrupoDeEntero] }>();
</script>

<template>
  <div
    class="max-w-full overflow-x-auto rounded-2xl bg-white ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700"
    role="region"
    :aria-label="`Pagos de ${matriz.anio} por mes y grupo`"
    tabindex="0"
  >
    <table class="w-full min-w-[44rem] border-collapse text-sm">
      <thead class="bg-tierra-100 text-left text-xs text-tierra-700 dark:bg-tierra-800 dark:text-tierra-200">
        <tr>
          <th scope="col" class="sticky left-0 bg-tierra-100 px-3 py-2 font-semibold dark:bg-tierra-800">Mes</th>
          <th v-for="grupo in GRUPOS_EN_ORDEN" :key="grupo" scope="col" class="px-3 py-2 font-semibold">
            {{ NOMBRES_CORTOS_DE_GRUPOS[grupo] }}
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
        <tr v-for="fila in matriz.meses" :key="fila.mes">
          <th scope="row" class="sticky left-0 bg-white px-3 py-2 text-left font-medium dark:bg-tierra-900">
            {{ nombreDelMes(fila.mes) }}
          </th>
          <td v-for="celda in fila.grupos" :key="celda.grupo" class="px-1 py-1 align-top">
            <button
              v-if="celda.estado !== 'sin_retenciones'"
              type="button"
              class="flex w-full flex-col items-start gap-1 rounded-lg px-2 py-1.5 text-left hover:bg-tierra-100 dark:hover:bg-tierra-800"
              :aria-label="`${nombreDelMes(fila.mes)}, ${NOMBRES_CORTOS_DE_GRUPOS[celda.grupo]}: ${NOMBRES_DE_ESTADOS[celda.estado]}. Ver pagos`"
              @click="$emit('abrir', fila.mes, celda.grupo)"
            >
              <InsigniaBase :tono="tonoDelEstado(celda.estado)">{{ NOMBRES_DE_ESTADOS[celda.estado] }}</InsigniaBase>
              <span class="text-xs tabular-nums text-tierra-600 dark:text-tierra-300">
                {{ formatearMonto(celda.pagado) }} de {{ formatearMonto(celda.retenido) }}
              </span>
            </button>
            <span v-else class="block px-2 py-1.5 text-tierra-400" aria-label="Sin retenciones">—</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
