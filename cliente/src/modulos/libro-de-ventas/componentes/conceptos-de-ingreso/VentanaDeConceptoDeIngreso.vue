<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeConceptoDeIngreso } from '../../composables/conceptos-de-ingreso/edicion-de-concepto-de-ingreso';
import CamposDeConceptoDeIngreso from './CamposDeConceptoDeIngreso.vue';

defineProps<{ errores: Record<string, string>; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeConceptoDeIngreso>({ required: true });
</script>

<template>
  <VentanaModal
    :abierta="edicion.abierta"
    :titulo="edicion.id ? 'Editar concepto de ingreso' : 'Nuevo concepto de ingreso'"
    @cerrar="emit('cerrar')"
  >
    <form id="form-concepto-de-ingreso" @submit.prevent="emit('guardar')">
      <CamposDeConceptoDeIngreso v-model="edicion" :errores="errores" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-concepto-de-ingreso" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
