<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { textoDeCentavos } from '../composables/dinero';
import type { Retiro } from '../servicios/tipos-de-retiros';

/** El retiro que se reparte: cuánto tiene, cuánto queda mientras se reparte (en rojo si se pasa) y sus avisos. */
const props = defineProps<{ retiro: Retiro; queda: number }>();
const sePasa = computed(() => props.queda < 0);
</script>

<template>
  <TarjetaBase class="space-y-3">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h2 class="font-semibold">
          <RouterLink
            :to="{ name: 'cuentas-por-pagar.retiros.ficha', params: { id: retiro.id } }"
            class="underline-offset-2 hover:underline"
          >
            Retiro {{ retiro.numero }}
          </RouterLink>
        </h2>
        <p class="text-sm text-tierra-600 dark:text-tierra-300">
          Custodio: {{ retiro.custodio }} · retirado el {{ formatearFecha(retiro.fecha) }}
        </p>
      </div>
      <dl class="grid grid-cols-2 gap-x-6 text-right text-sm">
        <div>
          <dt class="text-xs text-tierra-500">Disponible</dt>
          <dd class="text-lg font-semibold">{{ formatearMonto(retiro.disponible) }}</dd>
        </div>
        <div aria-live="polite">
          <dt class="text-xs text-tierra-500">Quedará</dt>
          <dd class="text-lg font-semibold" :class="sePasa ? 'text-red-700 dark:text-red-400' : ''">
            {{ queda < 0 ? '−' : '' }}{{ formatearMonto(textoDeCentavos(Math.abs(queda))) }}
          </dd>
        </div>
      </dl>
    </div>
    <p v-if="sePasa" class="text-sm text-red-700 dark:text-red-400" role="alert">
      Se está repartiendo más de lo que tiene el retiro. Baje montos o quite proveedores; si el efectivo no alcanza,
      registre otro retiro.
    </p>
    <p v-for="aviso in retiro.avisos" :key="aviso" class="text-sm text-tierra-700 dark:text-tierra-200">{{ aviso }}</p>
  </TarjetaBase>
</template>
