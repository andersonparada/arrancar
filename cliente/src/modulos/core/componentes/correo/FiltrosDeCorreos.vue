<script setup lang="ts">
import { X } from 'lucide-vue-next';
import { ESTADOS_PARA_FILTRAR } from '../../composables/correo/estado-del-correo';
import { hayFiltros, type FiltrosEscogidos } from '../../composables/correo/filtro-de-correos';
import { TIPOS_PARA_FILTRAR } from '../../composables/correo/servidor-de-correo';
import BotonBase from '../BotonBase.vue';
import CampoSelector from '../CampoSelector.vue';
import CampoTexto from '../CampoTexto.vue';

/** Los filtros del historial de correos: fechas de creación, estado y tipo. */
const emit = defineEmits<{ limpiar: [] }>();
const filtros = defineModel<FiltrosEscogidos>({ required: true });
</script>

<template>
  <form class="mb-4 grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,1fr)_auto]" @submit.prevent>
    <CampoTexto v-model="filtros.desde" etiqueta="Desde" tipo="date" />
    <CampoTexto v-model="filtros.hasta" etiqueta="Hasta" tipo="date" />
    <CampoSelector v-model="filtros.estado" etiqueta="Estado" :opciones="ESTADOS_PARA_FILTRAR" />
    <CampoSelector v-model="filtros.tipo" etiqueta="Tipo de correo" :opciones="TIPOS_PARA_FILTRAR" />
    <BotonBase v-if="hayFiltros(filtros)" variante="fantasma" :icono="X" @click="emit('limpiar')"
      >Quitar filtros</BotonBase
    >
  </form>
</template>
