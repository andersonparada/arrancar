<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { textoDeCentavos } from '../composables/dinero';

/** El total del reparto, siempre a la vista (pegado abajo en el celular), con cancelar y registrar todos los pagos. */
defineProps<{ total: number; proveedores: number; documentos: number; enviando: boolean }>();
defineEmits<{ cancelar: [] }>();
</script>

<template>
  <div
    class="sticky bottom-0 z-10 -mx-4 flex flex-col gap-3 border-t border-tierra-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:rounded-2xl sm:border sm:px-5 dark:border-tierra-700 dark:bg-tierra-900/95"
  >
    <p class="text-sm" aria-live="polite">
      <span class="block text-xs text-tierra-500">
        Total del reparto · {{ proveedores }} {{ proveedores === 1 ? 'proveedor' : 'proveedores' }} · {{ documentos }}
        {{ documentos === 1 ? 'documento' : 'documentos' }}
      </span>
      <strong class="text-xl">{{ formatearMonto(textoDeCentavos(total)) }}</strong>
    </p>
    <div class="flex gap-2 sm:justify-end">
      <BotonBase variante="secundario" class="flex-1 sm:flex-none" @click="$emit('cancelar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" class="flex-1 sm:flex-none" :cargando="enviando" :deshabilitado="documentos === 0">
        Registrar los pagos
      </BotonBase>
    </div>
  </div>
</template>
