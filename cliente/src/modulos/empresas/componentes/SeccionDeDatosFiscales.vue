<script setup lang="ts">
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';

defineProps<{ errores: Record<string, string> }>();
const razonSocial = defineModel<string>('razonSocial', { required: true });
const nombreComercial = defineModel<string>('nombreComercial', { required: true });
</script>

<template>
  <fieldset class="space-y-4">
    <legend class="mb-2 text-sm font-semibold text-tierra-800 dark:text-tierra-100">Datos fiscales</legend>
    <CampoTexto
      v-model="razonSocial"
      etiqueta="Razón social"
      placeholder="Como aparece en la SAT"
      :error="errores.razonSocial"
    />
    <CampoTexto
      v-model="nombreComercial"
      etiqueta="Nombre comercial"
      placeholder="Como lo conocen sus clientes"
      :error="errores.nombreComercial"
    />
  </fieldset>
</template>
