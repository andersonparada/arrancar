<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { OPCIONES_DE_FUENTE, type EdicionDeValor } from '../../composables/inmuebles/valores/edicion-de-valor';
import CamposDeValor from './CamposDeValor.vue';

defineProps<{ errores: Record<string, string>; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeValor>({ required: true });
</script>

<template>
  <VentanaModal
    :abierta="edicion.abierta"
    :titulo="`Nuevo valor de ${OPCIONES_DE_FUENTE[edicion.fuente].toLowerCase()}`"
    @cerrar="emit('cerrar')"
  >
    <form id="form-valor-de-inmueble" @submit.prevent="emit('guardar')">
      <CamposDeValor v-model="edicion" :errores="errores" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-valor-de-inmueble" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
