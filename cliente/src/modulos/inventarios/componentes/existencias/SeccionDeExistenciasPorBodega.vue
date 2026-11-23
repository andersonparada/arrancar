<script setup lang="ts">
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearCantidadDeInventario, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { Existencia } from '../../servicios/existencias.api';

/** Lo que hay del artículo en cada bodega y lote (solo lo que el usuario ve). */
defineProps<{ existencias: Existencia[]; cargando: boolean }>();
</script>

<template>
  <TarjetaBase>
    <h2 class="font-semibold">Existencias por bodega y lote</h2>
    <p v-if="cargando" class="mt-2 text-sm text-tierra-500">Cargando…</p>
    <p v-else-if="!existencias.length" class="mt-2 text-sm text-tierra-500">
      Este artículo todavía no tiene existencias en sus bodegas.
    </p>
    <ul v-else class="mt-2 divide-y divide-tierra-100 dark:divide-tierra-800">
      <li
        v-for="fila in existencias"
        :key="`${fila.bodegaId}-${fila.loteId ?? 'sin-lote'}`"
        class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 text-sm"
      >
        <span class="min-w-0">
          {{ fila.bodegaNombre }}
          <InsigniaBase v-if="fila.loteCodigo">Lote {{ fila.loteCodigo }}</InsigniaBase>
        </span>
        <span class="font-medium">
          {{ formatearCantidadDeInventario(fila.cantidad, fila.unidadBaseNombre) }}
          <span v-if="fila.valor !== null" class="font-normal text-tierra-500">· {{ formatearMonto(fila.valor) }}</span>
        </span>
      </li>
    </ul>
  </TarjetaBase>
</template>
