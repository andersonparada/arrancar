<script setup lang="ts">
import { CircleCheck, Plus, Printer } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { destinoDeLosRecibos } from '../composables/pagos/recibos-de-efectivo';
import type { RepartoRegistrado } from '../servicios/tipos-de-retiros';
import AvisosDelPago from './AvisosDelPago.vue';

/** Lo que se ve al repartir: los pagos creados con su recibo, cuánto queda en el retiro, los avisos y a dónde seguir. */
const props = defineProps<{ reparto: RepartoRegistrado }>();
defineEmits<{ otro: [] }>();
const idsDeLosPagos = props.reparto.pagos.map(({ id }) => id);
const clase =
  'inline-flex items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-tierra-800 ring-1 ring-tierra-200 hover:bg-tierra-100 dark:bg-tierra-800 dark:text-tierra-100 dark:ring-tierra-700 dark:hover:bg-tierra-700';
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-start gap-3" role="status">
      <CircleCheck class="mt-0.5 size-6 shrink-0 text-campo-700 dark:text-campo-300" aria-hidden="true" />
      <p class="font-medium">
        {{ reparto.pagos.length === 1 ? 'Se registró 1 pago' : `Se registraron ${reparto.pagos.length} pagos` }} con el
        retiro {{ reparto.retiro.numero }}. Imprima los recibos y pídale a cada proveedor que firme el suyo. Al retiro
        le quedan {{ formatearMonto(reparto.retiro.disponible) }}.
      </p>
    </div>
    <ul
      class="divide-y divide-tierra-200 rounded-xl ring-1 ring-tierra-200 dark:divide-tierra-700 dark:ring-tierra-700"
    >
      <li
        v-for="pago in reparto.pagos"
        :key="pago.id"
        class="flex flex-wrap items-center justify-between gap-2 px-3 py-3"
      >
        <span class="min-w-0">
          <span class="block font-medium">{{ pago.proveedor.nombre }}</span>
          <span class="block text-sm text-tierra-600 dark:text-tierra-300">Pago {{ pago.numero }}</span>
        </span>
        <span class="flex items-center gap-3">
          <strong>{{ formatearMonto(pago.monto) }}</strong>
          <RouterLink
            :to="{ name: 'cuentas-por-pagar.pagos.ficha', params: { id: pago.id } }"
            class="text-sm font-medium text-campo-700 underline dark:text-campo-300"
          >
            Ver
          </RouterLink>
        </span>
      </li>
    </ul>
    <AvisosDelPago :avisos="reparto.avisos" titulo="Revise estos avisos" />
    <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
      <RouterLink :to="{ name: 'cuentas-por-pagar.retiros.ficha', params: { id: reparto.retiro.id } }" :class="clase">
        Ver el retiro {{ reparto.retiro.numero }}
      </RouterLink>
      <BotonBase variante="secundario" :icono="Plus" @click="$emit('otro')">Repartir otra vez</BotonBase>
      <RouterLink
        :to="destinoDeLosRecibos(idsDeLosPagos)"
        class="inline-flex items-center justify-center gap-2 rounded-lg bg-campo-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-campo-800 dark:bg-campo-600 dark:hover:bg-campo-500"
      >
        <Printer class="size-4" aria-hidden="true" />
        {{ reparto.pagos.length === 1 ? 'Imprimir el recibo' : 'Imprimir los recibos' }}
      </RouterLink>
    </div>
  </div>
</template>
