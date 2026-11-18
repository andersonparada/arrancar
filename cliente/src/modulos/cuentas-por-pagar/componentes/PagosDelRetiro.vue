<script setup lang="ts">
import { computed } from 'vue';
import { Printer } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { destinoDeLosRecibos } from '../composables/pagos/recibos-de-efectivo';
import { MAXIMO_DE_PROVEEDORES_EN_EL_REPARTO } from '../composables/pagos/reparto-de-efectivo';
import { pagosVigentesDelRetiro } from '../composables/retiros/ficha-de-retiro';
import type { Retiro } from '../servicios/tipos-de-retiros';

/** Los pagos que salieron de este retiro, con enlace a cada uno; con varios vigentes se ofrece imprimir todos los recibos. */
const props = defineProps<{ ficha: Retiro }>();
const sesion = usarSesion();
const puedeVerPagos = computed(() => sesion.puede('cuentas-por-pagar.pagos.ver'));
/** Los recibos se imprimen de a 20 como máximo: se avisa si hay más. */
const vigentes = computed(() => pagosVigentesDelRetiro(props.ficha).map(({ id }) => id));
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
        <component
          :is="puedeVerPagos ? RouterLink : 'div'"
          :to="puedeVerPagos ? { name: 'cuentas-por-pagar.pagos.ficha', params: { id: pago.id } } : undefined"
          class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-3"
          :class="{
            'opacity-70': pago.estado === 'anulado',
            'hover:bg-tierra-100 dark:hover:bg-tierra-800': puedeVerPagos,
          }"
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
        </component>
      </li>
    </ul>
    <RouterLink
      v-if="puedeVerPagos && vigentes.length > 0"
      :to="destinoDeLosRecibos(vigentes)"
      class="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-campo-700 underline dark:text-campo-300"
    >
      <Printer class="size-4" aria-hidden="true" />
      Imprimir los recibos de los pagos vigentes
      <template v-if="vigentes.length > MAXIMO_DE_PROVEEDORES_EN_EL_REPARTO"
        >(solo los primeros {{ MAXIMO_DE_PROVEEDORES_EN_EL_REPARTO }} de {{ vigentes.length }}; imprima el resto desde
        cada pago)</template
      >
    </RouterLink>
  </template>
</template>
