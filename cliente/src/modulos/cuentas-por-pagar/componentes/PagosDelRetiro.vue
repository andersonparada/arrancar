<script setup lang="ts">
import { Printer } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { destinoDeLosRecibos } from '../composables/pagos/recibos-de-efectivo';
import { pagosVigentesDelRetiro } from '../composables/retiros/ficha-de-retiro';
import type { Retiro } from '../servicios/tipos-de-retiros';

/** Los pagos que salieron de este retiro, con enlace a cada uno; con varios vigentes se ofrece imprimir todos los recibos. */
defineProps<{ ficha: Retiro }>();
</script>

<template>
  <p
    v-if="ficha.pagos.length === 0"
    class="rounded-lg bg-tierra-100 px-3 py-3 text-sm text-tierra-700 dark:bg-tierra-800 dark:text-tierra-200"
  >
    Este retiro todavía no se usó para pagar a ningún proveedor.
  </p>
  <template v-else>
    <ul
      class="divide-y divide-tierra-200 rounded-xl ring-1 ring-tierra-200 dark:divide-tierra-700 dark:ring-tierra-700"
    >
      <li v-for="pago in ficha.pagos" :key="pago.id">
        <RouterLink
          v-permiso="'cuentas-por-pagar.pagos.ver'"
          :to="{ name: 'cuentas-por-pagar.pagos.ficha', params: { id: pago.id } }"
          class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-3 hover:bg-tierra-100 dark:hover:bg-tierra-800"
          :class="{ 'opacity-70': pago.estado === 'anulado' }"
        >
          <span class="min-w-0">
            <span class="block font-medium">{{ pago.proveedor.nombre }}</span>
            <span class="block text-sm text-tierra-600 dark:text-tierra-300">
              Pago {{ pago.numero }} · {{ formatearFecha(pago.fecha) }}
            </span>
          </span>
          <span class="flex items-center gap-2">
            <InsigniaBase v-if="pago.estado === 'anulado'" tono="rojo">Anulado</InsigniaBase>
            <strong>{{ formatearMonto(pago.monto) }}</strong>
          </span>
        </RouterLink>
      </li>
    </ul>
    <RouterLink
      v-if="pagosVigentesDelRetiro(ficha).length > 0"
      v-permiso="'cuentas-por-pagar.pagos.ver'"
      :to="destinoDeLosRecibos(pagosVigentesDelRetiro(ficha).map(({ id }) => id))"
      class="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-campo-700 underline dark:text-campo-300"
    >
      <Printer class="size-4" aria-hidden="true" />
      Imprimir los recibos de los pagos vigentes
    </RouterLink>
  </template>
</template>
