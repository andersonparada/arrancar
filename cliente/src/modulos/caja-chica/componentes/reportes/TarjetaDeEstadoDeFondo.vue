<script setup lang="ts">
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFechaHora, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { EstadoDeFondoAlCorte } from '../../servicios/tipos-de-reportes';

/** Un fondo en CC-R4: sus cifras al corte y su último arqueo con la diferencia. */
defineProps<{ fondo: EstadoDeFondoAlCorte }>();
</script>

<template>
  <TarjetaBase class="print:break-inside-avoid print:shadow-none">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h2 class="font-semibold">{{ fondo.nombre }}</h2>
      <p class="text-sm text-tierra-600 dark:text-tierra-300">Custodio: {{ fondo.custodio ?? 'sin custodio' }}</p>
    </div>
    <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
      <div>
        <dt class="text-xs text-tierra-500 dark:text-tierra-300">Monto del fondo</dt>
        <dd class="font-semibold tabular-nums">{{ formatearMonto(fondo.monto) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-tierra-500 dark:text-tierra-300">Efectivo esperado</dt>
        <dd class="font-semibold tabular-nums">{{ formatearMonto(fondo.efectivoEsperado) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-tierra-500 dark:text-tierra-300">Pendiente de reponer</dt>
        <dd class="tabular-nums">{{ formatearMonto(fondo.pendienteDeReponer) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-tierra-500 dark:text-tierra-300">Vales abiertos</dt>
        <dd class="tabular-nums">{{ formatearMonto(fondo.valesAbiertos) }}</dd>
      </div>
    </dl>
    <p class="mt-3 text-sm text-tierra-600 dark:text-tierra-300">
      <template v-if="fondo.ultimoArqueo && fondo.diferenciaDelArqueo !== null">
        Último arqueo: {{ formatearFechaHora(fondo.ultimoArqueo) }} · diferencia
        <span class="tabular-nums">{{ formatearMonto(fondo.diferenciaDelArqueo) }}</span>
      </template>
      <template v-else>Sin arqueos al corte.</template>
    </p>
  </TarjetaBase>
</template>
