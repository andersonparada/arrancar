<script setup lang="ts">
import { computed } from 'vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { OPCIONES_DE_TIPO, type EdicionDeMovimiento } from '../../composables/movimientos/edicion-de-movimiento';
import CamposDeMovimiento from './CamposDeMovimiento.vue';

defineProps<{
  errores: Record<string, string>;
  enviando: boolean;
  referencias: Record<'cuentaBancariaId', OpcionDeRegistro[]>;
}>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeMovimiento>({ required: true });

/** "Corregir movimiento", o "Nueva nota de crédito/débito" según el tipo elegido en el encabezado. */
const titulo = computed(() =>
  edicion.value.id ? 'Corregir movimiento' : `Nueva ${OPCIONES_DE_TIPO[edicion.value.tipo].toLowerCase()}`,
);
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" :titulo="titulo" @cerrar="emit('cerrar')">
    <form id="form-movimiento" @submit.prevent="emit('guardar')">
      <CamposDeMovimiento v-model="edicion" :errores="errores" :referencias="referencias" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-movimiento" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
