<script setup lang="ts">
import { CircleAlert, CircleCheck, Info } from 'lucide-vue-next';
import {
  esCruce,
  fraseDelCruce,
  NOTA_DE_LA_POLITICA_DE_CRUCES,
  textoDeLaConvencion,
  textoDeLoPublicado,
} from '../../composables/plataforma/convenciones-del-banguat';
import type { MensajeDeResultado } from '../../composables/plataforma/lista-de-monedas';
import type { MuestraDelBanguat } from '../../servicios/monedas.api';
import { formatearFecha, formatearTipoDeCambio } from '../../utilidades/formato';

defineProps<{ muestra: MuestraDelBanguat; resultado: MensajeDeResultado }>();

const iconos = { exito: CircleCheck, info: Info, error: CircleAlert } as const;
</script>

<template>
  <div
    class="rounded-lg bg-tierra-50 p-3 text-sm ring-1 ring-tierra-200 dark:bg-tierra-800/60 dark:ring-tierra-700"
    role="status"
    aria-live="polite"
  >
    <p
      class="flex items-start gap-2 font-medium"
      :class="resultado.tipo === 'error' ? 'text-red-700 dark:text-red-400' : 'text-tierra-800 dark:text-tierra-100'"
    >
      <component :is="iconos[resultado.tipo]" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{{ muestra.descripcion }} ({{ muestra.codigo }}): {{ resultado.mensaje }}</span>
    </p>
    <p v-if="muestra.valores.length" class="mt-2 text-xs text-tierra-600 dark:text-tierra-300">
      El Banguat publica este código en «{{ textoDeLaConvencion(muestra.convencion) }}».
    </p>
    <ul v-if="muestra.valores.length" class="mt-1 divide-y divide-tierra-200 dark:divide-tierra-700">
      <li v-for="valor in muestra.valores" :key="valor.fecha" class="py-1.5 tabular-nums">
        <p class="flex justify-between gap-3">
          <span>{{ formatearFecha(valor.fecha) }}</span>
          <span v-if="valor.referencia !== null" class="font-medium">
            Q {{ formatearTipoDeCambio(valor.referencia) }} por unidad
          </span>
          <span v-else class="font-medium text-amber-800 dark:text-amber-300">Sin dólar de ese día</span>
        </p>
        <p class="text-xs wrap-break-word text-tierra-600 dark:text-tierra-300">
          {{ textoDeLoPublicado(valor, muestra.convencion) }}
        </p>
        <p
          v-if="fraseDelCruce(valor, muestra.moneda ?? 'moneda', muestra.convencion)"
          class="text-xs wrap-break-word text-tierra-600 dark:text-tierra-300"
        >
          {{ fraseDelCruce(valor, muestra.moneda ?? 'moneda', muestra.convencion) }}
        </p>
      </li>
    </ul>
    <p v-if="muestra.valores.length" class="mt-2 text-xs text-tierra-600 dark:text-tierra-300">
      Compárelo con lo que espera: un euro ronda Q 8 a 9, un yen unos Q 0.05. Fuente: Banco de Guatemala. Nada se
      guardó.
      <template v-if="esCruce(muestra.convencion)"> {{ NOTA_DE_LA_POLITICA_DE_CRUCES }}</template>
    </p>
  </div>
</template>
