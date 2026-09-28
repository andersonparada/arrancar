<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';

/** Pide el motivo para devolver una conciliación elaborada a en proceso. */
defineProps<{ abierta: boolean; enviando: boolean; errores: Record<string, string> }>();
const emit = defineEmits<{ cerrar: []; devolver: [] }>();
const motivo = defineModel<string>('motivo', { required: true });
</script>

<template>
  <VentanaModal :abierta="abierta" titulo="Devolver conciliación" @cerrar="emit('cerrar')">
    <form id="form-devolucion" class="space-y-4" @submit.prevent="emit('devolver')">
      <p class="text-sm text-tierra-600 dark:text-tierra-300">
        Vuelve a en proceso: quien concilia podrá cambiar las marcas otra vez.
      </p>
      <CampoTexto v-model="motivo" etiqueta="Motivo" multilinea requerido :error="errores.motivo" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-devolucion" variante="peligro" :cargando="enviando">Devolver</BotonBase>
    </template>
  </VentanaModal>
</template>
