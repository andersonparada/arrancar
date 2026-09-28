<script setup lang="ts">
import { Download, Upload } from 'lucide-vue-next';
import BotonBase from '../BotonBase.vue';

/** Exportar e importar en Excel: cada botón solo aparece con su permiso. */
defineProps<{ permisos: { importar: string; exportar: string } }>();
const emit = defineEmits<{ exportar: []; importar: [] }>();
</script>

<template>
  <BotonBase v-permiso="permisos.exportar" variante="secundario" :icono="Download" @click="emit('exportar')">
    Exportar
  </BotonBase>
  <BotonBase v-permiso="permisos.importar" variante="secundario" :icono="Upload" @click="emit('importar')">
    Importar
  </BotonBase>
</template>
