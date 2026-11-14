<script setup lang="ts">
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { SaldoAFavorDeProveedor } from '../composables/notas-de-credito';

/** El saldo a favor de la empresa por proveedor, con lo que muestra la lista. */
defineProps<{ saldos: SaldoAFavorDeProveedor[] }>();
</script>

<template>
  <TarjetaBase v-if="saldos.length > 0" class="mb-4">
    <h2 class="mb-2 text-sm font-semibold">Saldo a favor por proveedor</h2>
    <ul class="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2 xl:grid-cols-3">
      <li v-for="saldo in saldos" :key="saldo.proveedorId" class="flex justify-between gap-3">
        <span class="min-w-0 truncate">
          {{ saldo.proveedorNombre }}
          <span class="text-xs text-tierra-500">({{ saldo.notas }} {{ saldo.notas === 1 ? 'nota' : 'notas' }})</span>
        </span>
        <span class="shrink-0 font-medium">{{ formatearMonto(saldo.saldo) }}</span>
      </li>
    </ul>
  </TarjetaBase>
</template>
