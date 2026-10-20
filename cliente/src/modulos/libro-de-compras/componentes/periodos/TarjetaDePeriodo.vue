<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import {
  mesDelPeriodo,
  nombreDelPeriodo,
  resumenDeLaUltimaDeclaracion,
  textoDelEstado,
  textoDelFormulario,
  tonoDelEstado,
} from '../../composables/periodos/datos-de-periodos';
import type { PeriodoDelLibro } from '../../servicios/periodos.api';
import { VENTANA_DE_PERIODOS as textos } from '../../textos-de-periodos';

/** Un mes del año: su estado y, si se declaró, cuándo, quién y en qué formulario. Toda la tarjeta lleva al período. */
defineProps<{ periodo: PeriodoDelLibro }>();
</script>

<template>
  <RouterLink
    :to="{ name: 'libro-de-compras.periodos.detalle', params: { periodo: mesDelPeriodo(periodo.periodo) } }"
    class="group flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-tierra-200/70 transition hover:ring-campo-500 focus-visible:outline-2 focus-visible:outline-campo-600 dark:bg-tierra-800/60 dark:ring-tierra-700 dark:hover:ring-campo-400"
    :aria-label="`${textos.abrir}: ${nombreDelPeriodo(periodo.periodo)}, ${textoDelEstado(periodo)}`"
  >
    <div class="min-w-0 flex-1 space-y-1.5">
      <div class="flex flex-wrap items-center gap-2">
        <h2 class="font-semibold">{{ nombreDelPeriodo(periodo.periodo) }}</h2>
        <InsigniaBase :tono="tonoDelEstado(periodo)">{{ textoDelEstado(periodo) }}</InsigniaBase>
      </div>
      <template v-if="periodo.ultimaDeclaracion">
        <p class="text-sm text-tierra-600 dark:text-tierra-300">{{ resumenDeLaUltimaDeclaracion(periodo) }}</p>
        <p v-if="textoDelFormulario(periodo.ultimaDeclaracion)" class="break-words text-xs text-tierra-500">
          {{ textoDelFormulario(periodo.ultimaDeclaracion) }}
        </p>
      </template>
      <p v-else class="text-sm text-tierra-500">{{ textos.sinDeclaraciones }}</p>
    </div>
    <ChevronRight class="size-5 shrink-0 text-tierra-400 group-hover:text-campo-600" aria-hidden="true" />
  </RouterLink>
</template>
