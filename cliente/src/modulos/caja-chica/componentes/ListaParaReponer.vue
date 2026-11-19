<script setup lang="ts">
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { terceroDelComprobante, tituloDeComprobante } from '../composables/comprobantes/detalles-de-comprobante';
import type { Comprobante } from '../servicios/tipos-de-comprobantes';
import MarcasDelComprobante from './MarcasDelComprobante.vue';

/** Lo pendiente de reponer, con una casilla por comprobante: el custodio desmarca lo que todavía no quiere reponer. */
defineProps<{ pendientes: readonly Comprobante[]; elegidos: readonly string[]; error?: string }>();
const emit = defineEmits<{ alternar: [id: string]; alternarTodos: [] }>();
</script>

<template>
  <section aria-labelledby="titulo-de-pendientes" class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 id="titulo-de-pendientes" class="text-lg font-semibold">Qué se repone</h2>
      <label class="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          class="size-5 rounded border-tierra-300 text-campo-600 focus:ring-campo-500"
          :checked="elegidos.length === pendientes.length"
          @change="emit('alternarTodos')"
        />
        Todos ({{ elegidos.length }} de {{ pendientes.length }})
      </label>
    </div>
    <p v-if="error" class="text-sm text-red-700 dark:text-red-400" role="alert">{{ error }}</p>
    <ul
      class="divide-y divide-tierra-200 rounded-2xl bg-white ring-1 ring-tierra-200/70 dark:divide-tierra-700 dark:bg-tierra-800/60 dark:ring-tierra-700"
    >
      <li v-for="comprobante in pendientes" :key="comprobante.id">
        <label class="flex cursor-pointer items-start gap-3 p-3 sm:p-4">
          <input
            type="checkbox"
            class="mt-1 size-5 shrink-0 rounded border-tierra-300 text-campo-600 focus:ring-campo-500"
            :checked="elegidos.includes(comprobante.id)"
            :aria-label="`Reponer ${tituloDeComprobante(comprobante)}`"
            @change="emit('alternar', comprobante.id)"
          />
          <span class="min-w-0 flex-1 space-y-1">
            <span class="flex flex-wrap items-baseline justify-between gap-x-3">
              <span class="min-w-0 truncate font-medium">{{ tituloDeComprobante(comprobante) }}</span>
              <span class="font-semibold tabular-nums">
                {{ comprobante.resta ? '−' : '' }}{{ formatearMonto(comprobante.monto) }}
              </span>
            </span>
            <span class="block truncate text-sm text-tierra-600 dark:text-tierra-300">
              {{ terceroDelComprobante(comprobante) }} · {{ formatearFecha(comprobante.fecha) }}
            </span>
            <MarcasDelComprobante :comprobante="comprobante" />
          </span>
        </label>
      </li>
    </ul>
  </section>
</template>
