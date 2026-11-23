<script setup lang="ts">
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import {
  formatearCantidadDeInventario,
  formatearCostoUnitario,
  formatearMonto,
} from '@/modulos/core/utilidades/formato';
import type { RenglonDeDocumento } from '../../servicios/documentos.api';

/** Los artículos del documento con su cantidad (y la escrita, como en el papel) y, si se ven, sus costos. */
defineProps<{ renglones: RenglonDeDocumento[] }>();
</script>

<template>
  <TarjetaBase>
    <h2 class="font-semibold">Artículos</h2>
    <p v-if="!renglones.length" class="mt-2 text-sm text-tierra-500">
      Este documento solo ajusta el valor de lo ya recibido: no mueve cantidades.
    </p>
    <ul v-else class="mt-2 divide-y divide-tierra-100 dark:divide-tierra-800">
      <li v-for="renglon in renglones" :key="renglon.movimientoId" class="py-3">
        <div class="flex flex-wrap items-baseline justify-between gap-x-4">
          <p class="min-w-0 font-medium">
            {{ renglon.articuloNombre }}
            <span class="text-sm font-normal text-tierra-500">({{ renglon.articuloCodigo }})</span>
          </p>
          <p class="font-medium">{{ formatearCantidadDeInventario(renglon.cantidad, renglon.unidadBaseNombre) }}</p>
        </div>
        <p class="text-xs text-tierra-500">
          <template v-if="renglon.loteCodigo">Lote {{ renglon.loteCodigo }}</template>
          <template v-if="renglon.cantidadEscrita && renglon.unidadEscritaSimbolo">
            <template v-if="renglon.loteCodigo"> · </template>
            Escrito como {{ formatearCantidadDeInventario(renglon.cantidadEscrita, renglon.unidadEscritaSimbolo) }}
          </template>
        </p>
        <p v-if="renglon.costoTotal !== null" class="mt-0.5 text-sm">
          {{ formatearMonto(renglon.costoTotal) }}
          <span v-if="renglon.costoUnitario !== null" class="text-tierra-500">
            · {{ formatearCostoUnitario(renglon.costoUnitario) }} por {{ renglon.unidadBaseNombre }}
          </span>
        </p>
      </li>
    </ul>
  </TarjetaBase>
</template>
