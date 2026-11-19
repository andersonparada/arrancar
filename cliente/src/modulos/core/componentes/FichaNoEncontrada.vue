<script setup lang="ts">
import { SearchX } from 'lucide-vue-next';
import type { RouteLocationRaw } from 'vue-router';
import EncabezadoPagina from './EncabezadoPagina.vue';
import EstadoVacio from './EstadoVacio.vue';

/** Lo que se ve cuando una ficha no cargó: el registro no existe o es de otra empresa. */
defineProps<{ titulo: string; volver: { texto: string; ruta: RouteLocationRaw } }>();
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="titulo" :volver="volver" />
    <EstadoVacio
      :icono="SearchX"
      titulo="No se encontró el registro"
      descripcion="No existe o no tiene acceso a él en la empresa activa."
    />
  </div>
</template>
