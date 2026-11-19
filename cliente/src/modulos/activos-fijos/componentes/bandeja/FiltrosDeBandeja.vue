<script setup lang="ts">
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { FiltrosEscritos } from '../../composables/bandeja/lineas-de-bandeja';

/** Buscar por texto en lo ya cargado y filtrar por fecha de emisión o por si el servidor propone una clase. */
const filtros = defineModel<FiltrosEscritos>({ required: true });
const texto = defineModel<string>('texto', { required: true });

const OPCIONES_DE_PROPUESTA: { valor: FiltrosEscritos['propuesta']; texto: string }[] = [
  { valor: 'todas', texto: 'Todas' },
  { valor: 'con', texto: 'Con clase propuesta' },
  { valor: 'sin', texto: 'Sin clase propuesta' },
];
</script>

<template>
  <form class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" role="search" @submit.prevent>
    <CampoTexto
      v-model="texto"
      etiqueta="Buscar"
      tipo="search"
      placeholder="Documento, proveedor o concepto"
      sin-correccion
    />
    <CampoTexto v-model="filtros.desde" etiqueta="Emitidas desde" tipo="date" />
    <CampoTexto v-model="filtros.hasta" etiqueta="Emitidas hasta" tipo="date" />
    <CampoSelector v-model="filtros.propuesta" etiqueta="Propuesta de clase" :opciones="OPCIONES_DE_PROPUESTA" />
  </form>
</template>
