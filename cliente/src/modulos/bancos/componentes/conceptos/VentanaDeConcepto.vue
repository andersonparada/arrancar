<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeConcepto } from '../../composables/conceptos/edicion-de-concepto';
import CamposDeConcepto from './CamposDeConcepto.vue';

defineProps<{ errores: Record<string, string>; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeConcepto>({ required: true });
</script>

<template>
  <VentanaModal
    :abierta="edicion.abierta"
    :titulo="edicion.id ? 'Editar concepto' : 'Nuevo concepto'"
    @cerrar="emit('cerrar')"
  >
    <form id="form-concepto" @submit.prevent="emit('guardar')">
      <CamposDeConcepto v-model="edicion" :errores="errores" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-concepto" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
