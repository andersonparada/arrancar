<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeChequera } from '../../composables/chequeras/edicion-de-chequera';
import CamposDeChequera from './CamposDeChequera.vue';

defineProps<{ errores: Record<string, string>; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeChequera>({ required: true });
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" titulo="Nueva chequera" @cerrar="emit('cerrar')">
    <form id="form-chequera" @submit.prevent="emit('guardar')">
      <CamposDeChequera v-model="edicion" :errores="errores" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-chequera" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
