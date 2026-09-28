<script setup lang="ts">
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { EdicionDeChequera } from '../../composables/chequeras/edicion-de-chequera';

defineProps<{ errores: Record<string, string> }>();
const edicion = defineModel<EdicionDeChequera>({ required: true });
</script>

<template>
  <div class="space-y-4">
    <CampoTexto v-model="edicion.serie" etiqueta="Serie (opcional)" :error="errores.serie" />
    <CampoTexto v-model="edicion.desde" etiqueta="Número inicial" tipo="number" requerido :error="errores.desde" />
    <CampoTexto v-model="edicion.hasta" etiqueta="Número final" tipo="number" requerido :error="errores.hasta" />
  </div>
</template>
