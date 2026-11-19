<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeUnidad } from '../../composables/unidades/edicion-de-unidad';
import CamposDeUnidad from './CamposDeUnidad.vue';

defineProps<{ errores: Record<string, string>; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeUnidad>({ required: true });
</script>

<template>
  <VentanaModal
    :abierta="edicion.abierta"
    :titulo="edicion.id ? 'Editar unidad de medida' : 'Nueva unidad de medida'"
    @cerrar="emit('cerrar')"
  >
    <form id="form-unidad" @submit.prevent="emit('guardar')">
      <CamposDeUnidad v-model="edicion" :errores="errores" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-unidad" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
