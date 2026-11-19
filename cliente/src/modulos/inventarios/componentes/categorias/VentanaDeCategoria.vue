<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeCategoria } from '../../composables/categorias/edicion-de-categoria';
import CamposDeCategoria from './CamposDeCategoria.vue';

defineProps<{ errores: Record<string, string>; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeCategoria>({ required: true });
</script>

<template>
  <VentanaModal
    :abierta="edicion.abierta"
    :titulo="edicion.id ? 'Editar categoría' : 'Nueva categoría'"
    @cerrar="emit('cerrar')"
  >
    <form id="form-categoria" @submit.prevent="emit('guardar')">
      <CamposDeCategoria v-model="edicion" :errores="errores" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-categoria" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
