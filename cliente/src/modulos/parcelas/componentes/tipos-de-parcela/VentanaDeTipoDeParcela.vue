<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeTipoDeParcela } from '../../composables/tipos-de-parcela/edicion-de-tipo-de-parcela';
import CamposDeTipoDeParcela from './CamposDeTipoDeParcela.vue';

defineProps<{ errores: Record<string, string>; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeTipoDeParcela>({ required: true });
</script>

<template>
  <VentanaModal
    :abierta="edicion.abierta"
    :titulo="edicion.id ? 'Editar tipo de parcela' : 'Nuevo tipo de parcela'"
    @cerrar="emit('cerrar')"
  >
    <form id="form-tipo-de-parcela" @submit.prevent="emit('guardar')">
      <CamposDeTipoDeParcela v-model="edicion" :errores="errores" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-tipo-de-parcela" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
