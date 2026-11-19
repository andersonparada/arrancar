<script setup lang="ts">
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearTexto } from '@/modulos/core/utilidades/formato';
import type { Traslado } from '../../servicios/activos.api';

/** El historial de ubicación del activo: la primera fila es el alta; después, cada traslado. */
defineProps<{ traslados: Traslado[] }>();
</script>

<template>
  <TarjetaBase>
    <h2 class="mb-3 text-sm font-semibold text-tierra-600 dark:text-tierra-300">Historial de ubicación</h2>
    <ul class="divide-y divide-tierra-200 text-sm dark:divide-tierra-700">
      <li v-for="traslado in traslados" :key="traslado.id" class="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2">
        <span class="w-28 shrink-0 text-tierra-500">{{ formatearFecha(traslado.fecha) }}</span>
        <span class="min-w-0 flex-1">
          {{ formatearTexto(traslado.localidadNombre) }}
          <template v-if="traslado.departamentoNombre"> · {{ traslado.departamentoNombre }}</template>
          <template v-if="traslado.responsable"> · {{ traslado.responsable }}</template>
          <template v-if="traslado.aBodega"> · En bodega de activos</template>
        </span>
        <span class="text-xs text-tierra-500">{{ traslado.esAlta ? 'Alta' : formatearTexto(traslado.motivo) }}</span>
      </li>
    </ul>
  </TarjetaBase>
</template>
