<script setup lang="ts">
import { RouterLink } from 'vue-router';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import {
  formatearCantidadDeInventario,
  formatearCostoUnitario,
  formatearMonto,
} from '@/modulos/core/utilidades/formato';
import { ETIQUETAS_DE_TIPO } from '../../composables/compartido/etiquetas';
import { estaSinExistencia, type ArticuloConExistencias } from '../../composables/existencias/agrupar-existencias';

/** Un artículo con su existencia total y por bodega; lleva a su kardex. Sin costos, no muestra dinero. */
defineProps<{ articulo: ArticuloConExistencias }>();
</script>

<template>
  <RouterLink
    :to="{ name: 'inventarios.existencias.kardex', params: { articuloId: articulo.articuloId } }"
    class="block h-full rounded-2xl transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none"
  >
    <TarjetaBase class="flex h-full flex-col gap-2">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <p class="truncate font-semibold">{{ articulo.nombre }}</p>
          <p class="truncate text-xs text-tierra-500">
            {{ articulo.codigo }} · {{ ETIQUETAS_DE_TIPO[articulo.tipoDeInventario] }}
          </p>
        </div>
        <InsigniaBase v-if="estaSinExistencia(articulo)" tono="rojo">Sin existencia</InsigniaBase>
      </div>
      <p class="text-2xl font-semibold">
        {{ formatearCantidadDeInventario(articulo.cantidadTotal, articulo.unidadBaseNombre) }}
      </p>
      <p v-if="articulo.valorTotal !== null" class="text-sm text-tierra-600 dark:text-tierra-300">
        {{ formatearMonto(articulo.valorTotal) }}
        <span v-if="articulo.costoUnitario !== null">
          · {{ formatearCostoUnitario(articulo.costoUnitario) }} por {{ articulo.unidadBaseNombre }}
        </span>
      </p>
      <ul v-if="articulo.bodegas.length" class="mt-auto flex flex-wrap gap-1.5 pt-1">
        <li
          v-for="bodega in articulo.bodegas"
          :key="bodega.bodegaId"
          class="rounded-full bg-tierra-100 px-2.5 py-0.5 text-xs dark:bg-tierra-800"
        >
          {{ bodega.bodegaNombre }}: {{ formatearCantidadDeInventario(bodega.cantidad) }}
        </li>
      </ul>
    </TarjetaBase>
  </RouterLink>
</template>
