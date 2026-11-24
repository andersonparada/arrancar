<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeMedicion } from '../../composables/mediciones/edicion-de-medicion';
import type { AjustesDeSuperficie } from '../../composables/superficie/unidades-de-superficie';
import CamposDeMedicion from '../superficie/CamposDeMedicion.vue';

defineProps<{ errores: Record<string, string>; enviando: boolean; ajustes: AjustesDeSuperficie }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeMedicion>({ required: true });
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" titulo="Registrar medición" ancha @cerrar="emit('cerrar')">
    <form id="form-medicion" @submit.prevent="emit('guardar')">
      <p class="mb-4 text-sm text-tierra-600 dark:text-tierra-300">
        Una medición nueva no borra las anteriores: la parcela toma la más reciente que ya empezó.
      </p>
      <CamposDeMedicion v-model="edicion" :errores="errores" :ajustes="ajustes" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-medicion" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
