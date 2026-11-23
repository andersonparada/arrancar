<script setup lang="ts">
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import { opcionesDeEtiquetas, ETIQUETAS_DE_TIPO } from '../../composables/compartido/etiquetas';
import type { FiltrosEscritos } from '../../composables/existencias/usar-existencias';

/** Los filtros de la lista de existencias; los que no pide el servidor (búsqueda) se aplican en pantalla. */
defineProps<{
  opcionesDeBodegas: OpcionDeRegistro[];
  opcionesDeCategorias: OpcionDeRegistro[];
  conBodegas: boolean;
  conCategorias: boolean;
}>();
const filtros = defineModel<FiltrosEscritos>('filtros', { required: true });
const busqueda = defineModel<string>('busqueda', { required: true });
const opcionesDeTipo = opcionesDeEtiquetas(ETIQUETAS_DE_TIPO, 'Todos los tipos');
</script>

<template>
  <form class="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="search" @submit.prevent>
    <CampoTexto v-model="busqueda" etiqueta="Buscar" tipo="search" placeholder="Código o nombre del artículo" />
    <CampoSelector v-if="conBodegas" v-model="filtros.bodegaId" etiqueta="Bodega" :opciones="opcionesDeBodegas" />
    <CampoSelector
      v-if="conCategorias"
      v-model="filtros.categoriaId"
      etiqueta="Categoría"
      :opciones="opcionesDeCategorias"
    />
    <CampoSelector v-model="filtros.tipoDeInventario" etiqueta="Tipo de inventario" :opciones="opcionesDeTipo" />
    <CampoInterruptor
      v-model="filtros.incluirEnCero"
      etiqueta="Incluir sin existencia"
      descripcion="También los artículos que se agotaron."
      class="sm:col-span-2"
    />
  </form>
</template>
