<script setup lang="ts">
import { formatearFechaHora, formatearTexto } from '@/modulos/core/utilidades/formato';
import { textoDeLaAccion } from '../../composables/correlativos/resumen-de-correlativos';
import type { Hueco } from '../../servicios/correlativos.api';

/**
 * Un número que falta y qué pasó con él: quién, cuándo, qué hizo y por qué. Si no hay rastro en la auditoría
 * (por ejemplo, un borrado directo en la base), se resalta como alerta.
 */
defineProps<{ hueco: Hueco }>();
</script>

<template>
  <li
    class="rounded-xl px-3 py-2 text-sm ring-1"
    :class="
      hueco.estado === 'alerta'
        ? 'bg-red-50 ring-red-300 dark:bg-red-950/40 dark:ring-red-800'
        : 'bg-tierra-50/60 ring-tierra-200/70 dark:bg-tierra-900/40 dark:ring-tierra-700'
    "
  >
    <p class="font-medium">
      No. {{ hueco.numero }}
      <span v-if="hueco.estado === 'alerta'" class="ml-1 font-semibold text-red-700 dark:text-red-400">
        Sin auditoría: revisar
      </span>
    </p>
    <p v-if="hueco.estado === 'alerta'" class="text-xs text-red-700 dark:text-red-300">
      No hay registro de quién lo eliminó ni por qué.
    </p>
    <ul
      v-for="(explicacion, indice) in hueco.explicaciones"
      :key="indice"
      class="mt-1 text-xs text-tierra-600 dark:text-tierra-300"
    >
      <li>
        {{ textoDeLaAccion(explicacion.accion) }} por {{ formatearTexto(explicacion.usuarioNombre) }} el
        {{ formatearFechaHora(explicacion.fecha) }}
      </li>
      <li>Motivo: {{ formatearTexto(explicacion.motivo) }}</li>
    </ul>
  </li>
</template>
