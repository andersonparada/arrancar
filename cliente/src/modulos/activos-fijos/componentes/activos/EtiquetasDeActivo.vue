<script setup lang="ts">
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import type { EtiquetaDeActivo } from '../../composables/activos/etiquetas-de-activo';

/** Las marcas que explican el estado del activo (en construcción, ocioso, en bodega…). */
defineProps<{ etiquetas: EtiquetaDeActivo[] }>();
</script>

<template>
  <span v-if="etiquetas.length" class="flex flex-wrap gap-1">
    <InsigniaBase v-for="etiqueta in etiquetas" :key="etiqueta.texto" :tono="etiqueta.tono">
      {{ etiqueta.texto }}
    </InsigniaBase>
  </span>
</template>
