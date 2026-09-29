<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeTipoDeLocalidad } from '../../composables/tipos-de-localidad/edicion-de-tipo-de-localidad';
import CamposDeTipoDeLocalidad from './CamposDeTipoDeLocalidad.vue';

defineProps<{ errores: Record<string, string>; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeTipoDeLocalidad>({ required: true });
</script>

<template>
  <VentanaModal
    :abierta="edicion.abierta"
    :titulo="edicion.id ? 'Editar tipo de localidad' : 'Nuevo tipo de localidad'"
    @cerrar="emit('cerrar')"
  >
    <form id="form-tipo-de-localidad" @submit.prevent="emit('guardar')">
      <CamposDeTipoDeLocalidad v-model="edicion" :errores="errores" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-tipo-de-localidad" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
