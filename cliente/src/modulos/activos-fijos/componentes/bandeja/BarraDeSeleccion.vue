<script setup lang="ts">
import { PackagePlus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';

/** La barra fija de abajo: cuántas líneas hay elegidas, cuánto falta por capitalizar en ellas y la acción. */
defineProps<{ cantidad: number; total: string; visibles: number }>();
const emit = defineEmits<{ capitalizar: []; quitar: []; todas: [] }>();
</script>

<template>
  <div
    v-permiso="'activos-fijos.costos.crear'"
    class="sticky bottom-0 z-10 -mx-4 mt-4 border-t border-tierra-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-5 dark:border-tierra-700 dark:bg-tierra-900/95"
  >
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <p class="text-sm sm:flex-1" aria-live="polite">
        <template v-if="cantidad">
          <strong>{{ cantidad }} línea{{ cantidad === 1 ? '' : 's' }} elegida{{ cantidad === 1 ? '' : 's' }}</strong>
          con {{ formatearMonto(total) }} pendientes.
        </template>
        <template v-else>Elija las líneas que quiere capitalizar; puede elegir de varios documentos.</template>
      </p>
      <div class="flex flex-wrap gap-2">
        <BotonBase v-if="cantidad" variante="fantasma" @click="emit('quitar')">Quitar la elección</BotonBase>
        <BotonBase v-else-if="visibles" variante="fantasma" @click="emit('todas')">Elegir las {{ visibles }}</BotonBase>
        <BotonBase :icono="PackagePlus" :deshabilitado="!cantidad" @click="emit('capitalizar')">Capitalizar</BotonBase>
      </div>
    </div>
  </div>
</template>
