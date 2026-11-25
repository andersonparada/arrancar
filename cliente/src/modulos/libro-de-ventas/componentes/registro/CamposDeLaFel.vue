<script setup lang="ts">
import { computed } from 'vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { EdicionDeDocumento } from '../../composables/documentos/edicion-de-documento';
import { opcionesDeCodigoDte } from '../../composables/documentos/tipos-de-documento';
import { FORMULARIO_DE_DOCUMENTO as textos } from '../../textos-de-documentos';

/** Factura electrónica: la autorización del DTE y su código de la SAT (solo si el documento es electrónico). */
defineProps<{ errores: Record<string, string> }>();
const edicion = defineModel<EdicionDeDocumento>({ required: true });
const codigos = computed(() => opcionesDeCodigoDte(edicion.value.tipo));
const conFel = computed(() => edicion.value.autorizacionFel.trim() !== '');
</script>

<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
    <CampoTexto
      v-model="edicion.autorizacionFel"
      etiqueta="Autorización FEL"
      sin-correccion
      :ayuda="textos.ayudaDeLaFel"
      :error="errores.autorizacionFel"
    />
    <CampoSelector
      v-if="conFel"
      v-model="edicion.tipoDte"
      etiqueta="Código SAT"
      requerido
      :opciones="codigos"
      :error="errores.tipoDte"
    />
  </div>
</template>
