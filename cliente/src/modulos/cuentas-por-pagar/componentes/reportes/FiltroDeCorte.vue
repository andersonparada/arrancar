<script setup lang="ts">
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';

/** La fecha de corte: el reporte muestra lo que se debía al cierre de ese día. */
defineProps<{ error?: string }>();
const corte = defineModel<string>({ required: true });
</script>

<template>
  <CampoTexto
    v-model="corte"
    etiqueta="Fecha de corte"
    tipo="date"
    :error="error"
    ayuda="Los saldos al cierre de ese día."
  />
</template>
