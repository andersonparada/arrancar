<script setup lang="ts">
import { computed } from 'vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { OPCIONES_DE_TIPO, type EdicionDeNota } from '../../composables/notas/edicion-de-nota';
import CamposDeNota from './CamposDeNota.vue';

defineProps<{
  errores: Record<string, string>;
  enviando: boolean;
  referencias: Record<'cuentaBancariaId', OpcionDeRegistro[]>;
}>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeNota>({ required: true });

/** "Corregir nota", o "Nueva nota de crédito/débito" según el tipo elegido en el encabezado. */
const titulo = computed(() =>
  edicion.value.id ? 'Corregir nota' : `Nueva ${OPCIONES_DE_TIPO[edicion.value.tipo].toLowerCase()}`,
);
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" :titulo="titulo" @cerrar="emit('cerrar')">
    <form id="form-nota" @submit.prevent="emit('guardar')">
      <CamposDeNota v-model="edicion" :errores="errores" :referencias="referencias" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-nota" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
