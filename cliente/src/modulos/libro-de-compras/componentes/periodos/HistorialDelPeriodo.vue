<script setup lang="ts">
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { formatearFechaHora } from '@/modulos/core/utilidades/formato';
import { textoDelEvento, textoDelFormulario } from '../../composables/periodos/datos-de-periodos';
import type { DeclaracionDelPeriodo } from '../../servicios/periodos.api';
import { DETALLE_DE_PERIODO as textos } from '../../textos-de-periodos';

/** Las declaraciones, rectificaciones y reaperturas del período, la más reciente primero. */
defineProps<{ historial: DeclaracionDelPeriodo[] }>();
</script>

<template>
  <p v-if="historial.length === 0" class="text-sm text-tierra-500">{{ textos.historialVacio }}</p>
  <ol v-else class="space-y-3">
    <li
      v-for="declaracion in [...historial].reverse()"
      :key="declaracion.id"
      class="rounded-xl border border-tierra-200 p-3 text-sm dark:border-tierra-700"
    >
      <div class="flex flex-wrap items-center gap-2">
        <InsigniaBase :tono="declaracion.evento === 'reapertura' ? 'trigo' : 'campo'">
          {{ textoDelEvento(declaracion) }}
        </InsigniaBase>
        <span class="text-tierra-600 dark:text-tierra-300">
          {{ formatearFechaHora(declaracion.registradaEn)
          }}<template v-if="declaracion.registradaPor"> · {{ declaracion.registradaPor.nombre }}</template>
        </span>
      </div>
      <p v-if="textoDelFormulario(declaracion)" class="mt-1.5 break-words">{{ textoDelFormulario(declaracion) }}</p>
      <p v-if="declaracion.motivo" class="mt-1.5 break-words">
        <span class="font-medium">Motivo:</span> {{ declaracion.motivo }}
      </p>
    </li>
  </ol>
</template>
