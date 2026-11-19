<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeClase } from '../../composables/clases/edicion-de-clase';
import CamposDeClase from './CamposDeClase.vue';

defineProps<{ errores: Record<string, string>; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeClase>({ required: true });
</script>

<template>
  <VentanaModal
    :abierta="edicion.abierta"
    :titulo="edicion.id ? 'Editar clase de activo' : 'Nueva clase de activo'"
    @cerrar="emit('cerrar')"
  >
    <form id="form-clase" @submit.prevent="emit('guardar')">
      <CamposDeClase v-model="edicion" :errores="errores" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-clase" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
