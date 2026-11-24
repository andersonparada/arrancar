<script setup lang="ts">
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';

/** Bodega y rango de fechas del kardex. Sin alcance total no hay «Toda la empresa»: hay que elegir una bodega. */
defineProps<{ opcionesDeBodegas: OpcionDeRegistro[] }>();
const filtros = defineModel<{ bodegaId: string | null; desde: string; hasta: string }>({ required: true });
</script>

<template>
  <form class="grid gap-3 sm:grid-cols-3" role="search" @submit.prevent>
    <CampoSelector v-model="filtros.bodegaId" etiqueta="Bodega" :opciones="opcionesDeBodegas" />
    <CampoTexto v-model="filtros.desde" etiqueta="Desde" tipo="date" />
    <CampoTexto v-model="filtros.hasta" etiqueta="Hasta" tipo="date" />
  </form>
</template>
