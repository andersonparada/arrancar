<script setup lang="ts">
import { computed } from 'vue';
import { CircleAlert, CircleCheck, OctagonX } from 'lucide-vue-next';
import { textoDelCorte, type CorteDeTandas } from '../../composables/bandeja/confirmar-por-tandas';
import {
  textoDelError,
  type FilaConError,
  type FilaRegistrada,
} from '../../composables/bandeja/datos-de-la-confirmacion';
import { agruparAvisos, textoDeRegistrados } from '../../composables/bandeja/resumen-de-la-confirmacion';

/**
 * Lo que pasó al confirmar, en un solo mensaje: cuántos se registraron, los avisos agrupados (cada uno una vez, con
 * cuántos documentos lo tienen y «Ver cuáles»), lo que se cortó y lo que falló. Lo que no se registró sigue pendiente
 * y marcado, para corregirlo y reintentar.
 */
const props = defineProps<{
  titulos: ReadonlyMap<string, string>;
  registradas: FilaRegistrada[];
  conError: FilaConError[];
  corte: CorteDeTandas | null;
}>();
const avisosAgrupados = computed(() => agruparAvisos(props.registradas, props.titulos));
const titulosDe = (ids: readonly string[]): string => ids.map((id) => props.titulos.get(id) ?? id).join(', ');
</script>

<template>
  <div class="space-y-3" role="status">
    <p class="flex items-center gap-2 font-medium">
      <CircleCheck class="size-5 shrink-0 text-campo-700 dark:text-campo-300" aria-hidden="true" />
      {{ textoDeRegistrados(registradas.length) }}
    </p>
    <ul v-if="avisosAgrupados.length" class="space-y-1 text-sm text-tierra-600 dark:text-tierra-300">
      <li v-for="grupo in avisosAgrupados" :key="grupo.aviso">
        <template v-if="grupo.titulos.length === 1">
          <strong>{{ grupo.titulos[0] }}:</strong> {{ grupo.aviso }}
        </template>
        <details v-else>
          <summary class="min-h-6 cursor-pointer">
            {{ grupo.aviso }} ({{ grupo.titulos.length }} documentos).
            <span class="font-medium underline">Ver cuáles</span>
          </summary>
          <p class="mt-1 wrap-break-word">{{ grupo.titulos.join(', ') }}</p>
        </details>
      </li>
    </ul>
    <div
      v-if="corte"
      class="space-y-1 rounded-lg bg-red-50 p-3 text-sm text-red-900 dark:bg-red-950 dark:text-red-200"
      role="alert"
    >
      <p class="flex items-center gap-2 font-medium">
        <OctagonX class="size-5 shrink-0" aria-hidden="true" />
        El envío se detuvo antes de terminar
      </p>
      <p v-for="linea in textoDelCorte(corte, registradas.length)" :key="linea">{{ linea }}</p>
      <details>
        <summary class="min-h-6 cursor-pointer font-medium underline">Ver cuáles no se confirmaron</summary>
        <p class="mt-1 wrap-break-word">{{ titulosDe(corte.sinConfirmar) }}</p>
      </details>
    </div>
    <template v-if="conError.length">
      <p class="flex items-center gap-2 font-medium text-red-800 dark:text-red-300">
        <CircleAlert class="size-5 shrink-0" aria-hidden="true" />
        {{
          conError.length === 1
            ? '1 factura no se registró y sigue pendiente:'
            : `${conError.length} facturas no se registraron y siguen pendientes:`
        }}
      </p>
      <ul class="space-y-2">
        <li
          v-for="fila in conError"
          :key="fila.id"
          class="rounded-lg bg-red-50 p-3 text-sm text-red-900 dark:bg-red-950 dark:text-red-200"
        >
          <p class="font-medium">{{ titulos.get(fila.id) }}</p>
          <p>{{ textoDelError(fila.error) }}</p>
        </li>
      </ul>
    </template>
  </div>
</template>
