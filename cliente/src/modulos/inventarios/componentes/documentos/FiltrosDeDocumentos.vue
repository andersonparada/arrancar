<script setup lang="ts">
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import { ETIQUETAS_DE_CLASE, ETIQUETAS_DE_ESTADO, opcionesDeEtiquetas } from '../../composables/compartido/etiquetas';
import type { FiltrosDeLaLista } from '../../composables/documentos/usar-lista-de-documentos';

/** Clase, bodega, estado y fechas de la lista de movimientos. */
defineProps<{ opcionesDeBodegas: OpcionDeRegistro[]; conBodegas: boolean }>();
const filtros = defineModel<FiltrosDeLaLista>({ required: true });
const opcionesDeClase = opcionesDeEtiquetas(ETIQUETAS_DE_CLASE, 'Todas las clases');
const opcionesDeEstado = opcionesDeEtiquetas(ETIQUETAS_DE_ESTADO, 'Vigentes y anulados');
</script>

<template>
  <form class="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" role="search" @submit.prevent>
    <CampoSelector v-model="filtros.clase" etiqueta="Clase" :opciones="opcionesDeClase" />
    <CampoSelector v-if="conBodegas" v-model="filtros.bodegaId" etiqueta="Bodega" :opciones="opcionesDeBodegas" />
    <CampoSelector v-model="filtros.estado" etiqueta="Estado" :opciones="opcionesDeEstado" />
    <CampoTexto v-model="filtros.desde" etiqueta="Desde" tipo="date" />
    <CampoTexto v-model="filtros.hasta" etiqueta="Hasta" tipo="date" />
  </form>
</template>
