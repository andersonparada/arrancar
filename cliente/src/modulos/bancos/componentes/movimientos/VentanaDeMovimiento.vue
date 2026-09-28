<script setup lang="ts">
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeMovimiento } from '../../composables/movimientos/edicion-de-movimiento';
import CamposDeMovimiento from './CamposDeMovimiento.vue';

defineProps<{
  errores: Record<string, string>;
  enviando: boolean;
  referencias: Record<'cuentaBancariaId', OpcionDeRegistro[]>;
}>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeMovimiento>({ required: true });
</script>

<template>
  <VentanaModal
    :abierta="edicion.abierta"
    :titulo="edicion.id ? 'Editar movimiento' : 'Nuevo movimiento'"
    @cerrar="emit('cerrar')"
  >
    <form id="form-movimiento" @submit.prevent="emit('guardar')">
      <CamposDeMovimiento v-model="edicion" :errores="errores" :referencias="referencias" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-movimiento" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
