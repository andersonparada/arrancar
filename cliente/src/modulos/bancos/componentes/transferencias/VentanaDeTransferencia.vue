<script setup lang="ts">
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeTransferencia } from '../../composables/transferencias/edicion-de-transferencia';
import CamposDeTransferencia from './CamposDeTransferencia.vue';

defineProps<{
  errores: Record<string, string>;
  enviando: boolean;
  referencias: Record<'cuentaOrigenId' | 'cuentaDestinoId', OpcionDeRegistro[]>;
}>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeTransferencia>({ required: true });
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" titulo="Nueva transferencia" @cerrar="emit('cerrar')">
    <form id="form-transferencia" @submit.prevent="emit('guardar')">
      <CamposDeTransferencia v-model="edicion" :errores="errores" :referencias="referencias" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-transferencia" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
