<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeFormatoDeCheque } from '../../composables/formatos-de-cheque/edicion-de-formato-de-cheque';
import type { ClaveDePlantilla, PlantillaDeCheque } from '../../servicios/tipos-de-formatos-de-cheque';
import CamposDeFormatoDeCheque from './CamposDeFormatoDeCheque.vue';

defineProps<{
  errores: Record<string, string>;
  problemas: string[];
  enviando: boolean;
  plantillas: PlantillaDeCheque[];
}>();
const emit = defineEmits<{ cerrar: []; guardar: []; 'cambiar-base': [base: ClaveDePlantilla] }>();
const edicion = defineModel<EdicionDeFormatoDeCheque>({ required: true });
</script>

<template>
  <VentanaModal
    :abierta="edicion.abierta"
    :titulo="edicion.id ? 'Editar formato de cheque' : 'Nuevo formato de cheque'"
    ancha
    @cerrar="emit('cerrar')"
  >
    <form id="form-formato-de-cheque" @submit.prevent="emit('guardar')">
      <CamposDeFormatoDeCheque
        v-model="edicion"
        :errores="errores"
        :problemas="problemas"
        :plantillas="plantillas"
        @cambiar-base="emit('cambiar-base', $event)"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-formato-de-cheque" :cargando="enviando" :deshabilitado="!edicion.formato">
        Guardar
      </BotonBase>
    </template>
  </VentanaModal>
</template>
