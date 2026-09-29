<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';

/** Barra fija abajo mientras haya cheques seleccionados: cuántos son, cuánto suman y el botón de anular. */
defineProps<{ cantidad: number; monto: string }>();
const emit = defineEmits<{ anular: []; limpiar: [] }>();
</script>

<template>
  <div
    v-if="cantidad > 0"
    role="region"
    aria-label="Cheques seleccionados"
    class="fixed inset-x-0 bottom-0 z-30 border-t border-tierra-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg print:hidden dark:border-tierra-700 dark:bg-tierra-900"
  >
    <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
      <p class="text-sm font-semibold">
        {{ cantidad }} {{ cantidad === 1 ? 'cheque' : 'cheques' }} · {{ formatearMonto(monto) }}
      </p>
      <div class="flex gap-2">
        <BotonBase variante="fantasma" @click="emit('limpiar')">Quitar selección</BotonBase>
        <BotonBase variante="peligro" @click="emit('anular')">Anular seleccionados</BotonBase>
      </div>
    </div>
  </div>
</template>
