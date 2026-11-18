<script setup lang="ts">
import { RouterLink } from 'vue-router';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { notaDelCargo } from '../../composables/reportes/bancarizacion';
import type { CargoDeBancarizacion } from '../../servicios/tipos-de-reportes-de-efectivo';

/** Los cargos que cubrió un pago en efectivo, con la marca fiscal y lo que se pierde en cada uno. */
defineProps<{ cargos: CargoDeBancarizacion[] }>();
</script>

<template>
  <ul class="mt-1 space-y-1">
    <li
      v-for="cargo in cargos"
      :key="cargo.documentoId"
      class="rounded-lg bg-tierra-50 px-2 py-1.5 text-xs dark:bg-tierra-900/40 print:bg-transparent"
    >
      <RouterLink
        :to="{ name: 'cuentas-por-pagar.documentos.ficha', params: { documentoId: cargo.documentoId } }"
        class="rounded font-medium text-campo-700 hover:underline focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none dark:text-campo-300 print:text-current print:no-underline"
      >
        {{ cargo.documento }}
      </RouterLink>
      <span class="ml-1 inline-flex flex-wrap gap-1 align-middle">
        <InsigniaBase v-for="marca in cargo.marcas" :key="marca" tono="rojo">{{ marca }}</InsigniaBase>
      </span>
      <span v-if="cargo.marcas.length === 0" class="ml-1 text-tierra-500">Sin efecto fiscal</span>
      <span class="block tabular-nums">
        <template v-if="Number(cargo.ivaEnRiesgo) > 0">IVA en riesgo {{ formatearMonto(cargo.ivaEnRiesgo) }}</template>
        <template v-if="Number(cargo.ivaEnRiesgo) > 0 && Number(cargo.costoNoDeducible) > 0"> · </template>
        <template v-if="Number(cargo.costoNoDeducible) > 0">
          Costo no deducible {{ formatearMonto(cargo.costoNoDeducible) }}
        </template>
      </span>
      <span v-if="notaDelCargo(cargo)" class="block text-tierra-600 dark:text-tierra-300">{{
        notaDelCargo(cargo)
      }}</span>
    </li>
  </ul>
</template>
