<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearMonto, formatearNit } from '@/modulos/core/utilidades/formato';
import {
  proveedorParaRevisar,
  rutaDeDocumentosDelProveedor,
  tieneFichas,
  tramosConSaldo,
} from '../../composables/reportes/bloques-de-saldos';
import type { FilaDeSaldo } from '../../servicios/tipos-de-reportes';

/** Un proveedor (o un NIT con varias fichas) en el celular: su saldo neto y lo que lo compone. */
defineProps<{ fila: FilaDeSaldo; corte: string; deudor: boolean }>();
</script>

<template>
  <TarjetaBase class="space-y-3">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="truncate font-semibold">{{ fila.nombre }}</p>
        <p class="text-xs text-tierra-500 dark:text-tierra-300">NIT {{ formatearNit(fila.nit) }}</p>
      </div>
      <div class="text-right">
        <p class="text-lg font-semibold tabular-nums">{{ formatearMonto(fila.saldoNeto) }}</p>
        <p class="text-xs text-tierra-500 dark:text-tierra-300">{{ deudor ? 'Nos deben' : 'Saldo neto' }}</p>
      </div>
    </div>
    <dl class="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
      <template v-for="tramo in tramosConSaldo(fila)" :key="tramo.clave">
        <dt class="text-tierra-500 dark:text-tierra-300">{{ tramo.etiqueta }}</dt>
        <dd class="text-right tabular-nums">{{ formatearMonto(tramo.monto) }}</dd>
      </template>
      <dt class="font-medium">Total de cargos</dt>
      <dd class="text-right font-medium tabular-nums">{{ formatearMonto(fila.totalCargos) }}</dd>
      <template v-if="Number(fila.saldosAFavor) !== 0">
        <dt class="text-tierra-500 dark:text-tierra-300">Saldos a favor</dt>
        <dd class="text-right tabular-nums">{{ formatearMonto(fila.saldosAFavor) }}</dd>
      </template>
      <template v-if="Number(fila.comprometido) !== 0">
        <dt class="text-tierra-500 dark:text-tierra-300">Comprometido</dt>
        <dd class="text-right tabular-nums">{{ formatearMonto(fila.comprometido) }}</dd>
      </template>
      <template v-if="fila.disponible !== null">
        <dt class="text-tierra-500 dark:text-tierra-300">Disponible para pagar</dt>
        <dd class="text-right tabular-nums">{{ formatearMonto(fila.disponible) }}</dd>
      </template>
      <template v-if="Number(fila.sinAutorizar) !== 0">
        <dt class="text-tierra-500 dark:text-tierra-300">Sin autorizar</dt>
        <dd class="text-right tabular-nums">{{ formatearMonto(fila.sinAutorizar) }}</dd>
      </template>
    </dl>
    <ul v-if="tieneFichas(fila)" class="space-y-1 border-t border-tierra-100 pt-2 dark:border-tierra-700">
      <li v-for="ficha in fila.fichas" :key="ficha.proveedorId ?? ficha.nombre">
        <RouterLink
          v-if="ficha.proveedorId"
          :to="rutaDeDocumentosDelProveedor(ficha.proveedorId, corte)"
          class="flex items-center justify-between gap-2 rounded-lg py-1 text-sm focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none"
        >
          <span class="truncate">Ficha: {{ ficha.nombre }}</span>
          <span class="tabular-nums">{{ formatearMonto(ficha.saldoNeto) }}</span>
        </RouterLink>
      </li>
    </ul>
    <RouterLink
      v-if="proveedorParaRevisar(fila)"
      :to="rutaDeDocumentosDelProveedor(proveedorParaRevisar(fila)!, corte)"
      class="flex items-center justify-end gap-1 rounded-lg text-sm font-medium text-campo-700 focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none dark:text-campo-300"
    >
      Ver sus documentos
      <ChevronRight class="size-4" aria-hidden="true" />
    </RouterLink>
  </TarjetaBase>
</template>
