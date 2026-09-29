<script setup lang="ts">
import { Sparkles } from 'lucide-vue-next';
import { fraseDeSugerencia, rotuloDeOpcion, textoDeConfianza } from '../../composables/sugerencias/frase-de-sugerencia';
import type { OpcionSugerida, SugerenciaDeMovimiento } from '../../servicios/sugerencias.api';

/**
 * Bajo el selector de concepto de una nota o un cheque: «Sugerido: Planilla · 85 % (usar)» con su «¿Por qué?», o
 * los posibles si ninguno alcanza la confianza mínima. Solo propone: quien registra decide con un clic.
 */
const props = defineProps<{ sugerencia: SugerenciaDeMovimiento | null }>();
const emit = defineEmits<{ usar: [conceptoId: string] }>();

const frase = (opcion: OpcionSugerida): string => fraseDeSugerencia(opcion, props.sugerencia?.casosComparados ?? 0);
const CLASE_DEL_BOTON =
  'rounded-full px-2.5 py-1 text-xs font-medium focus-visible:outline-2 focus-visible:outline-campo-500';
</script>

<template>
  <div v-if="sugerencia" class="-mt-2 space-y-1.5 text-sm text-tierra-600 dark:text-tierra-300" aria-live="polite">
    <template v-if="sugerencia.sugerido">
      <p class="flex flex-wrap items-center gap-2">
        <Sparkles class="size-4 text-campo-600" aria-hidden="true" />
        <span>Sugerido:</span>
        <button
          type="button"
          :class="[
            CLASE_DEL_BOTON,
            'bg-campo-100 text-campo-800 hover:bg-campo-200 dark:bg-campo-900/50 dark:text-campo-200',
          ]"
          :aria-label="`Usar el concepto sugerido ${sugerencia.sugerido.conceptoNombre}, confianza ${textoDeConfianza(sugerencia.sugerido.confianza)}`"
          @click="emit('usar', sugerencia.sugerido.conceptoId)"
        >
          {{ rotuloDeOpcion(sugerencia.sugerido) }} (usar)
        </button>
      </p>
      <details class="text-xs">
        <summary class="cursor-pointer rounded font-medium text-campo-700 dark:text-campo-400">¿Por qué?</summary>
        <p class="mt-1">{{ frase(sugerencia.sugerido) }}</p>
      </details>
    </template>
    <p v-if="sugerencia.alternativas.length" class="flex flex-wrap items-center gap-1.5 text-xs">
      <span>{{ sugerencia.sugerido ? 'Otras opciones:' : 'Posibles:' }}</span>
      <button
        v-for="opcion in sugerencia.alternativas"
        :key="opcion.conceptoId"
        type="button"
        :title="frase(opcion)"
        :class="[
          CLASE_DEL_BOTON,
          'bg-tierra-100 text-tierra-700 hover:bg-tierra-200 dark:bg-tierra-800 dark:text-tierra-200 dark:hover:bg-tierra-700',
        ]"
        :aria-label="`Usar ${opcion.conceptoNombre}, confianza ${textoDeConfianza(opcion.confianza)}. ${frase(opcion)}`"
        @click="emit('usar', opcion.conceptoId)"
      >
        {{ rotuloDeOpcion(opcion) }}
      </button>
    </p>
  </div>
</template>
