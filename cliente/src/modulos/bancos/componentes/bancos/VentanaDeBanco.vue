<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeBanco } from '../../composables/bancos/edicion-de-banco';
import CamposDeBanco from './CamposDeBanco.vue';

defineProps<{ errores: Record<string, string>; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeBanco>({ required: true });
</script>

<template>
  <VentanaModal
    :abierta="edicion.abierta"
    :titulo="edicion.id ? 'Editar banco' : 'Nuevo banco'"
    @cerrar="emit('cerrar')"
  >
    <form id="form-banco" @submit.prevent="emit('guardar')">
      <CamposDeBanco v-model="edicion" :errores="errores" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-banco" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
