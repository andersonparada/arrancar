<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { avisoDeLaFalta } from '../../composables/documentos/avisos-de-la-falta';
import { FORMULARIO_DE_DOCUMENTO as textos } from '../../textos-de-documentos';

/** La barra de abajo, siempre a la vista: el total, lo que falta y los botones de registrar. */
defineProps<{ total: string; pendientes: string[]; enviando: boolean }>();
defineEmits<{ cancelar: []; 'registrar-otro': [] }>();
</script>

<template>
  <div
    class="sticky bottom-0 z-10 mt-6 flex flex-col gap-3 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-tierra-200 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-4 dark:bg-tierra-900/95 dark:ring-tierra-700"
  >
    <div class="min-w-0 text-sm" aria-live="polite">
      <p>
        <span class="text-tierra-500">Total:</span>
        <span class="ml-1 text-base font-semibold tabular-nums">{{ formatearMonto(total) }}</span>
      </p>
      <p v-if="pendientes.length" class="text-tierra-600 dark:text-tierra-300">{{ avisoDeLaFalta(pendientes) }}</p>
    </div>
    <div class="flex flex-wrap justify-end gap-2">
      <BotonBase variante="secundario" @click="$emit('cancelar')">{{ textos.cancelar }}</BotonBase>
      <BotonBase variante="secundario" :deshabilitado="enviando" @click="$emit('registrar-otro')">
        Registrar y seguir con otro
      </BotonBase>
      <BotonBase tipo="submit" :cargando="enviando">{{ textos.registrar }}</BotonBase>
    </div>
  </div>
</template>
