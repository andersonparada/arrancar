<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeCombustible } from '../../composables/combustibles/edicion-de-combustible';
import CamposDeCombustible from './CamposDeCombustible.vue';

defineProps<{ errores: Record<string, string>; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeCombustible>({ required: true });
</script>

<template>
  <VentanaModal
    :abierta="edicion.abierta"
    :titulo="edicion.id ? 'Editar combustible' : 'Nuevo combustible'"
    @cerrar="emit('cerrar')"
  >
    <form id="form-combustible" @submit.prevent="emit('guardar')">
      <CamposDeCombustible v-model="edicion" :errores="errores" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-combustible" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
