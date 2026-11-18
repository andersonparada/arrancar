<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { nombreDeLaForma } from '../composables/pagos/detalles-de-pago';
import type { PagoDelDocumento } from '../servicios/tipos';
import SeccionDeFicha from './SeccionDeFicha.vue';

/** Lo que los pagos entregaron a este cargo, vigentes y anulados; cada uno lleva a su ficha. */
const props = defineProps<{ pagos: PagoDelDocumento[] }>();
const hayVigentes = computed(() => props.pagos.some(({ estado }) => estado === 'vigente'));
</script>

<template>
  <SeccionDeFicha v-if="pagos.length" :titulo="`Pagos (${pagos.length})`">
    <p v-if="hayVigentes" class="mb-2 text-sm text-tierra-700 dark:text-tierra-300">
      Mientras tenga pagos vigentes el documento no se puede anular: anule primero sus pagos.
    </p>
    <ul class="space-y-2">
      <li v-for="pago in pagos" :key="`${pago.pagoId}-${pago.contrasenaId}`">
        <TarjetaBase
          class="flex flex-wrap items-center justify-between gap-2 text-sm"
          :class="{ 'opacity-70': pago.estado === 'anulado' }"
        >
          <p class="min-w-0 flex-1 basis-60">
            <RouterLink
              v-permiso="'cuentas-por-pagar.pagos.ver'"
              :to="`/cuentas-por-pagar/pagos/${pago.pagoId}`"
              class="font-medium text-campo-700 underline dark:text-campo-300"
            >
              Pago {{ pago.numero }}
            </RouterLink>
            · {{ nombreDeLaForma(pago.forma) }}
            <span class="block text-xs text-tierra-500">
              {{ formatearFecha(pago.fecha) }}
              <template v-if="Number(pago.retencionDescontada) > 0">
                · Descontó {{ formatearMonto(pago.retencionDescontada) }} de retención
              </template>
            </span>
          </p>
          <span class="flex flex-wrap items-center gap-2">
            <InsigniaBase v-if="pago.estado === 'anulado'" tono="rojo">Anulado</InsigniaBase>
            <InsigniaBase v-else-if="pago.comprometido" tono="trigo">Posfechado</InsigniaBase>
            <strong :class="{ 'line-through': pago.estado === 'anulado' }">{{ formatearMonto(pago.monto) }}</strong>
          </span>
        </TarjetaBase>
      </li>
    </ul>
  </SeccionDeFicha>
</template>
