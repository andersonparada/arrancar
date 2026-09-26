<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { ShieldX } from 'lucide-vue-next';
import EstadoVacio from '../componentes/EstadoVacio.vue';
</script>

<template>
  <EstadoVacio :icono="ShieldX" titulo="No tiene acceso a esta sección" descripcion="Si la necesita, pídale al dueño de la cuenta que le asigne el permiso.">
    <RouterLink to="/" class="text-sm font-medium text-campo-700 underline dark:text-campo-300">Volver al inicio</RouterLink>
  </EstadoVacio>
</template>
