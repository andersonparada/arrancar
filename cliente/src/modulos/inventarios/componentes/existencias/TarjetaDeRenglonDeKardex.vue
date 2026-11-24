<script setup lang="ts">
import { RouterLink } from 'vue-router';
import {
  formatearCantidadDeInventario,
  formatearCostoUnitario,
  formatearFecha,
  formatearMonto,
} from '@/modulos/core/utilidades/formato';
import { ETIQUETAS_DE_CLASE, ETIQUETAS_DE_TIPO_DE_MOVIMIENTO } from '../../composables/compartido/etiquetas';
import type { ClaseDeDocumento } from '../../servicios/documentos.api';
import type { RenglonDeKardex } from '../../servicios/existencias.api';

/** Un movimiento del kardex: lleva al documento que lo originó. Sin costos, solo cantidades. */
defineProps<{ renglon: RenglonDeKardex; unidad: string }>();
</script>

<template>
  <RouterLink
    :to="{ name: 'inventarios.movimientos.ficha', params: { documentoId: renglon.documentoId } }"
    class="block rounded-xl bg-white p-3 ring-1 ring-tierra-200/70 hover:bg-tierra-50 focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none dark:bg-tierra-800/60 dark:ring-tierra-700 dark:hover:bg-tierra-800"
  >
    <div class="flex flex-wrap items-baseline justify-between gap-x-3">
      <p class="font-medium">
        {{ ETIQUETAS_DE_CLASE[renglon.clase as ClaseDeDocumento] ?? renglon.clase }} n.º {{ renglon.numeroDeDocumento }}
      </p>
      <p class="text-sm text-tierra-500">{{ formatearFecha(renglon.fecha) }}</p>
    </div>
    <p class="text-xs text-tierra-500">
      {{ ETIQUETAS_DE_TIPO_DE_MOVIMIENTO[renglon.tipo] ?? renglon.tipo }}
      <template v-if="renglon.bodegaNombre"> · {{ renglon.bodegaNombre }}</template>
      <template v-if="renglon.loteCodigo"> · Lote {{ renglon.loteCodigo }}</template>
    </p>
    <dl class="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
      <div v-if="renglon.entrada">
        <dt class="text-xs text-tierra-500">Entrada</dt>
        <dd class="font-medium text-campo-700 dark:text-campo-300">
          +{{ formatearCantidadDeInventario(renglon.entrada, unidad) }}
        </dd>
      </div>
      <div v-if="renglon.salida">
        <dt class="text-xs text-tierra-500">Salida</dt>
        <dd class="font-medium text-red-700 dark:text-red-300">
          −{{ formatearCantidadDeInventario(renglon.salida, unidad) }}
        </dd>
      </div>
      <div>
        <dt class="text-xs text-tierra-500">Saldo</dt>
        <dd class="font-medium">{{ formatearCantidadDeInventario(renglon.saldoCantidad, unidad) }}</dd>
      </div>
      <div v-if="renglon.costoUnitario !== null">
        <dt class="text-xs text-tierra-500">Costo unitario</dt>
        <dd>{{ formatearCostoUnitario(renglon.costoUnitario) }}</dd>
      </div>
      <div v-if="renglon.costoTotal !== null">
        <dt class="text-xs text-tierra-500">Costo del movimiento</dt>
        <dd>{{ formatearMonto(renglon.costoTotal) }}</dd>
      </div>
      <div v-if="renglon.saldoValor !== null">
        <dt class="text-xs text-tierra-500">Valor del saldo</dt>
        <dd>{{ formatearMonto(renglon.saldoValor) }}</dd>
      </div>
    </dl>
  </RouterLink>
</template>
