<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';

/**
 * Ventana para anular un registro: pide el motivo, obligatorio. Genérica por
 * `titulo` y `texto`: sirve para movimientos, y luego para transferencias y
 * cheques.
 */
defineProps<{
  abierta: boolean;
  titulo: string;
  texto: string;
  errores: Record<string, string>;
  enviando: boolean;
}>();
const emit = defineEmits<{ cerrar: []; anular: [] }>();
const motivo = defineModel<string>('motivo', { required: true });
</script>

<template>
  <VentanaModal :abierta="abierta" :titulo="titulo" @cerrar="emit('cerrar')">
    <form id="form-anulacion" class="space-y-4" @submit.prevent="emit('anular')">
      <p class="text-sm text-tierra-600 dark:text-tierra-300">{{ texto }}</p>
      <CampoTexto v-model="motivo" etiqueta="Motivo" multilinea requerido :error="errores.motivo" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-anulacion" variante="peligro" :cargando="enviando">Anular</BotonBase>
    </template>
  </VentanaModal>
</template>
