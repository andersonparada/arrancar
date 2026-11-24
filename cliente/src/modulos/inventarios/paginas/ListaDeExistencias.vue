<script setup lang="ts">
import { Inbox } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import FiltrosDeExistencias from '../componentes/existencias/FiltrosDeExistencias.vue';
import TarjetaDeExistencia from '../componentes/existencias/TarjetaDeExistencia.vue';
import { usarExistencias } from '../composables/existencias/usar-existencias';
import { VENTANAS_INVENTARIOS } from '../textos';

const ventana = VENTANAS_INVENTARIOS.existencias;
const { filtros, busqueda, cargando, articulos, visibles, hayFiltros, valorTotal, referencias, limpiar } =
  usarExistencias();
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" />

    <FiltrosDeExistencias
      v-model:filtros="filtros"
      v-model:busqueda="busqueda"
      :opciones-de-bodegas="referencias.opcionesDeBodegas.value"
      :opciones-de-categorias="referencias.opcionesDeCategorias.value"
      :con-bodegas="referencias.hayBodegas"
      :con-categorias="referencias.hayCategorias"
    />
    <p v-if="valorTotal !== null && visibles.length" class="mb-3 text-sm text-tierra-600 dark:text-tierra-300">
      {{ visibles.length }} artículos · valor total {{ formatearMonto(valorTotal) }}
    </p>

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio
      v-else-if="!articulos.length"
      :icono="Inbox"
      :titulo="hayFiltros ? 'Ningún artículo coincide con los filtros' : 'Todavía no hay existencias'"
      :descripcion="
        hayFiltros
          ? 'Pruebe con otra bodega, categoría o tipo.'
          : 'Las existencias aparecen al recibir compras desde «Por recibir» o al registrar una entrada en Movimientos.'
      "
    >
      <BotonBase v-if="hayFiltros" variante="secundario" @click="limpiar">Quitar filtros</BotonBase>
    </EstadoVacio>
    <EstadoVacio v-else-if="!visibles.length" :icono="Inbox" titulo="Ningún artículo coincide con la búsqueda" />
    <ul v-else class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <li v-for="articulo in visibles" :key="articulo.articuloId">
        <TarjetaDeExistencia :articulo="articulo" />
      </li>
    </ul>
  </div>
</template>
