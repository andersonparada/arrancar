<script setup lang="ts">
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeCheque } from '../../composables/cheques/edicion-de-cheque';
import CamposDeCheque from './CamposDeCheque.vue';

defineProps<{
  errores: Record<string, string>;
  enviando: boolean;
  referencias: { cuentaBancariaId: OpcionDeRegistro[] };
  opcionesDeCheque: OpcionDeRegistro[];
}>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeCheque>({ required: true });
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" titulo="Emitir cheque" @cerrar="emit('cerrar')">
    <form id="form-cheque" @submit.prevent="emit('guardar')">
      <CamposDeCheque
        v-model="edicion"
        :errores="errores"
        :referencias="referencias"
        :opciones-de-cheque="opcionesDeCheque"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-cheque" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
