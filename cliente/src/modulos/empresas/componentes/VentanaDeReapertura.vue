<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';

defineProps<{ abierta: boolean; errores: Record<string, string>; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; confirmar: [] }>();
const motivo = defineModel<string>('motivo', { required: true });
</script>

<template>
  <VentanaModal :abierta="abierta" titulo="Reabrir la carga inicial" @cerrar="emit('cerrar')">
    <form id="form-reapertura" class="space-y-4" @submit.prevent="emit('confirmar')">
      <p class="text-sm text-tierra-600 dark:text-tierra-300">
        Al reabrirla se podrá corregir la fecha de inicio y volver a registrar saldos iniciales. Quedará anotado en la
        auditoría quién la reabrió y por qué.
      </p>
      <CampoTexto v-model="motivo" etiqueta="Motivo" multilinea requerido :error="errores.motivo" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-reapertura" variante="peligro" :cargando="enviando">Reabrir</BotonBase>
    </template>
  </VentanaModal>
</template>
