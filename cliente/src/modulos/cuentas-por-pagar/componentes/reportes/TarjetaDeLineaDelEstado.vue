<script setup lang="ts">
import { RouterLink } from 'vue-router';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { notaDeAnteriores, textoDeHecho, textoDeLinea, tieneFicha } from '../../composables/reportes/estado-de-cuenta';
import type { LineaDelEstado } from '../../servicios/tipos-de-reportes-de-proveedor';

/** Una línea del estado de cuenta en el celular: qué pasó, de cuánto fue y cómo quedó el saldo. */
defineProps<{ linea: LineaDelEstado; interna: boolean }>();
</script>

<template>
  <TarjetaBase class="space-y-1" :class="{ 'opacity-60': linea.anulada }">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="text-xs text-tierra-500 dark:text-tierra-300">
          {{ formatearFecha(linea.fecha) }} · {{ textoDeHecho(linea.hecho) }}
        </p>
        <RouterLink
          v-if="tieneFicha(linea)"
          :to="{ name: 'cuentas-por-pagar.documentos.ficha', params: { documentoId: linea.documentoId } }"
          class="rounded font-medium text-campo-700 focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none dark:text-campo-300"
        >
          {{ textoDeLinea(linea) }}
        </RouterLink>
        <p v-else class="font-medium">{{ textoDeLinea(linea) }}</p>
      </div>
      <div class="shrink-0 text-right">
        <p v-if="linea.saldo !== null" class="font-semibold tabular-nums">{{ formatearMonto(linea.saldo) }}</p>
        <InsigniaBase v-else tono="tierra">Anulada</InsigniaBase>
        <p v-if="linea.saldo !== null" class="text-xs text-tierra-500 dark:text-tierra-300">Saldo</p>
      </div>
    </div>
    <p class="text-sm tabular-nums text-tierra-700 dark:text-tierra-200">
      <template v-if="linea.cargo !== null">Cargo {{ formatearMonto(linea.cargo) }}</template>
      <template v-if="linea.abono !== null">Abono {{ formatearMonto(linea.abono) }}</template>
      <template v-if="interna && linea.total !== null">
        · Total {{ formatearMonto(linea.total) }}
        <template v-if="linea.retenciones !== null"> · Retenciones {{ formatearMonto(linea.retenciones) }}</template>
      </template>
    </p>
    <p v-if="notaDeAnteriores(linea)" class="text-xs text-tierra-500">{{ notaDeAnteriores(linea) }}</p>
  </TarjetaBase>
</template>
