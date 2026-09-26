<script setup lang="ts">
import { RouterView } from 'vue-router';
import CapaAvisos from './modulos/core/componentes/CapaAvisos.vue';
import IndicadorConexion from './modulos/core/componentes/IndicadorConexion.vue';
</script>

<template>
  <IndicadorConexion />
  <RouterView />
  <CapaAvisos />
</template>
