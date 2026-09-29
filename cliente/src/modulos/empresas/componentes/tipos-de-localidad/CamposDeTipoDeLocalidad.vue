<script setup lang="ts">
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { EdicionDeTipoDeLocalidad } from '../../composables/tipos-de-localidad/edicion-de-tipo-de-localidad';

/** Los campos del tipo de localidad; los usan la ventana y el formulario en página, así se ven igual. */
defineProps<{ errores: Record<string, string> }>();
const edicion = defineModel<EdicionDeTipoDeLocalidad>({ required: true });
</script>

<template>
  <div class="space-y-4">
    <CampoTexto v-model="edicion.nombre" etiqueta="Nombre" requerido :error="errores.nombre" />
    <CampoInterruptor v-model="edicion.activo" etiqueta="Activo" />
  </div>
</template>
