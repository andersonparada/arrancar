<script setup lang="ts">
import { Sparkles } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { fraseDeSugerencia, rotuloDeOpcion, textoDeConfianza } from '../../composables/sugerencias/frase-de-sugerencia';
import type { OpcionSugerida, SugerenciaDeMovimiento } from '../../servicios/sugerencias.api';

/**
 * Lo que propone el servidor para un pendiente. Con concepto sugerido: la insignia con su % , «¿Por qué?» y «Usar»
 * (un clic clasifica: es la confirmación). Sin sugerido pero con posibles: «Posibles», en gris, que también se
 * pueden usar. Sin nada, no se muestra nada. El % es confianza, no una probabilidad exacta.
 */
const props = defineProps<{ sugerencia: SugerenciaDeMovimiento | null; enviando: boolean }>();
const emit = defineEmits<{ usar: [opcion: OpcionSugerida] }>();

const frase = (opcion: OpcionSugerida): string => fraseDeSugerencia(opcion, props.sugerencia?.casosComparados ?? 0);
const posibles = (): OpcionSugerida[] => props.sugerencia?.alternativas ?? [];
</script>

<template>
  <div
    v-if="sugerencia && (sugerencia.sugerido || posibles().length)"
    class="mt-3 space-y-2 border-t border-tierra-100 pt-3 dark:border-tierra-700"
  >
    <div v-if="sugerencia.sugerido" class="flex flex-wrap items-center justify-between gap-2">
      <InsigniaBase tono="campo">
        <Sparkles class="mr-1 size-3.5" aria-hidden="true" />Sugerido: {{ rotuloDeOpcion(sugerencia.sugerido) }}
      </InsigniaBase>
      <BotonBase
        v-permiso="'bancos.notas.editar'"
        pequeno
        :deshabilitado="enviando"
        :aria-label="`Usar el concepto sugerido ${sugerencia.sugerido.conceptoNombre}`"
        @click="emit('usar', sugerencia.sugerido)"
      >
        Usar
      </BotonBase>
    </div>
    <details v-if="sugerencia.sugerido" class="text-xs text-tierra-600 dark:text-tierra-300">
      <summary
        class="cursor-pointer rounded font-medium text-campo-700 focus-visible:outline-2 focus-visible:outline-campo-500 dark:text-campo-400"
      >
        ¿Por qué?
      </summary>
      <p class="mt-1">{{ frase(sugerencia.sugerido) }}</p>
    </details>
    <div
      v-if="posibles().length"
      class="flex flex-wrap items-center gap-1.5 text-xs text-tierra-600 dark:text-tierra-300"
    >
      <span>{{ sugerencia.sugerido ? 'Otras opciones:' : 'Posibles:' }}</span>
      <button
        v-for="opcion in posibles()"
        :key="opcion.conceptoId"
        v-permiso="'bancos.notas.editar'"
        type="button"
        :disabled="enviando"
        :title="frase(opcion)"
        class="rounded-full bg-tierra-100 px-2.5 py-1 font-medium text-tierra-700 hover:bg-tierra-200 focus-visible:outline-2 focus-visible:outline-campo-500 disabled:opacity-60 dark:bg-tierra-800 dark:text-tierra-200 dark:hover:bg-tierra-700"
        :aria-label="`Usar ${opcion.conceptoNombre}, confianza ${textoDeConfianza(opcion.confianza)}. ${frase(opcion)}`"
        @click="emit('usar', opcion)"
      >
        {{ rotuloDeOpcion(opcion) }}
      </button>
    </div>
  </div>
</template>
