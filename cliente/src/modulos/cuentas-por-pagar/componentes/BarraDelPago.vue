<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { textoDeCentavos } from '../composables/dinero';

/** El total del pago, siempre a la vista (pegado abajo en el celular), con cancelar y registrar. */
defineProps<{ total: number; retencion: number; cantidad: number; textoDelBoton: string; enviando: boolean }>();
defineEmits<{ cancelar: [] }>();
</script>

<template>
  <div
    class="sticky bottom-0 z-10 -mx-4 flex flex-col gap-3 border-t border-tierra-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:rounded-2xl sm:border sm:px-5 dark:border-tierra-700 dark:bg-tierra-900/95"
  >
    <p class="text-sm" aria-live="polite">
      <span class="block text-xs text-tierra-500">
        Total a pagar · {{ cantidad }} {{ cantidad === 1 ? 'documento' : 'documentos' }}
      </span>
      <strong class="text-xl">{{ formatearMonto(textoDeCentavos(total)) }}</strong>
      <span v-if="retencion > 0" class="ml-2 text-xs text-tierra-600 dark:text-tierra-300">
        con la retención de {{ formatearMonto(textoDeCentavos(retencion)) }} cubre
        {{ formatearMonto(textoDeCentavos(total + retencion)) }}
      </span>
    </p>
    <div class="flex gap-2 sm:justify-end">
      <BotonBase variante="secundario" class="flex-1 sm:flex-none" @click="$emit('cancelar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" class="flex-1 sm:flex-none" :cargando="enviando" :deshabilitado="cantidad === 0">
        {{ textoDelBoton }}
      </BotonBase>
    </div>
  </div>
</template>
