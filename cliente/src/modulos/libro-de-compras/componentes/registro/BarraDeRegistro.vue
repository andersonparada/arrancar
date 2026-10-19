<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { FORMULARIO_DE_DOCUMENTO as textos } from '../../textos-del-registro';

/** La barra de abajo, siempre a la vista: el neto a pagar, lo que falta y el botón de registrar. */
defineProps<{ neto: string | null; pendientes: string[]; enviando: boolean; puedeRegistrar: boolean }>();
defineEmits<{ cancelar: [] }>();
</script>

<template>
  <div
    class="sticky bottom-0 z-10 mt-6 flex flex-col gap-3 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-tierra-200 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-4 dark:bg-tierra-900/95 dark:ring-tierra-700"
  >
    <div class="min-w-0 text-sm" aria-live="polite">
      <p v-if="neto !== null">
        <span class="text-tierra-500">Neto a pagar:</span>
        <span class="ml-1 text-base font-semibold tabular-nums">{{ formatearMonto(neto) }}</span>
      </p>
      <p v-if="pendientes.length" class="text-tierra-600 dark:text-tierra-300">Falta {{ pendientes.join(', ') }}.</p>
    </div>
    <div class="flex justify-end gap-2">
      <BotonBase variante="secundario" @click="$emit('cancelar')">{{ textos.cancelar }}</BotonBase>
      <BotonBase tipo="submit" :cargando="enviando" :deshabilitado="!puedeRegistrar">{{ textos.registrar }}</BotonBase>
    </div>
  </div>
</template>
