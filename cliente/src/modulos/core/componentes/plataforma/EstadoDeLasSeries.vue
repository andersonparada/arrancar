<script setup lang="ts">
import { CircleCheck, TriangleAlert } from 'lucide-vue-next';
import { avisoDeAtraso } from '../../composables/plataforma/lista-de-monedas';
import type { EstadoDeLaSerie } from '../../servicios/tipos-de-cambio.api';
import { formatearFecha } from '../../utilidades/formato';

defineProps<{ series: EstadoDeLaSerie[] }>();
</script>

<template>
  <p v-if="!series.length" class="text-sm text-tierra-600 dark:text-tierra-300">
    Ninguna moneda tiene código del Banguat todavía. Únalo en Monedas para que su tipo de cambio se cargue.
  </p>
  <ul v-else class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
    <li
      v-for="serie in series"
      :key="serie.moneda"
      class="rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700"
    >
      <p class="flex items-center justify-between gap-2">
        <span class="font-medium">{{ serie.nombre }} ({{ serie.moneda }})</span>
        <span v-if="!serie.activa" class="text-xs text-tierra-500">Inactiva: no se carga</span>
      </p>
      <p class="text-xs text-tierra-600 dark:text-tierra-300">Último tipo: {{ formatearFecha(serie.ultimaFecha) }}</p>
      <p
        v-if="avisoDeAtraso(serie)"
        class="mt-1 flex items-start gap-1.5 text-xs font-medium text-red-700 dark:text-red-400"
      >
        <TriangleAlert class="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        {{ avisoDeAtraso(serie) }} Ingrese el valor a mano si urge.
      </p>
      <p v-else-if="serie.activa" class="mt-1 flex items-center gap-1.5 text-xs text-campo-800 dark:text-campo-300">
        <CircleCheck class="size-3.5 shrink-0" aria-hidden="true" />
        Al día
      </p>
    </li>
  </ul>
</template>
