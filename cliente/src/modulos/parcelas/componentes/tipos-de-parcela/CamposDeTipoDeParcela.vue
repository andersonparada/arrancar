<script setup lang="ts">
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { EdicionDeTipoDeParcela } from '../../composables/tipos-de-parcela/edicion-de-tipo-de-parcela';

/** Los campos del tipo de parcela; los usan la ventana y el formulario en página, así se ven igual. */
defineProps<{ errores: Record<string, string> }>();
const edicion = defineModel<EdicionDeTipoDeParcela>({ required: true });
</script>

<template>
  <div class="space-y-4">
    <CampoTexto v-model="edicion.nombre" etiqueta="Nombre" requerido :error="errores.nombre" />
    <CampoInterruptor v-model="edicion.activo" etiqueta="Activo" />
  </div>
</template>
