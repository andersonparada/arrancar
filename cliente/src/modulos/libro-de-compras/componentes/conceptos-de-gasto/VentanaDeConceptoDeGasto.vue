<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeConceptoDeGasto } from '../../composables/conceptos-de-gasto/edicion-de-concepto-de-gasto';
import CamposDeConceptoDeGasto from './CamposDeConceptoDeGasto.vue';

defineProps<{ errores: Record<string, string>; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeConceptoDeGasto>({ required: true });
</script>

<template>
  <VentanaModal
    :abierta="edicion.abierta"
    :titulo="edicion.id ? 'Editar concepto de gasto' : 'Nuevo concepto de gasto'"
    @cerrar="emit('cerrar')"
  >
    <form id="form-concepto-de-gasto" @submit.prevent="emit('guardar')">
      <CamposDeConceptoDeGasto v-model="edicion" :errores="errores" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-concepto-de-gasto" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
