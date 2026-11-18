<script setup lang="ts">
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { textoDeDiasAbierto, textoDeFormaDeRetiro } from '../../composables/reportes/retiros-por-liquidar';
import type { FilaDeRetiroPorLiquidar } from '../../servicios/tipos-de-reportes-de-efectivo';

/** Un retiro abierto en el celular: lo que más importa es cuánto efectivo sigue en manos del custodio. */
defineProps<{ fila: FilaDeRetiroPorLiquidar }>();
</script>

<template>
  <TarjetaBase>
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="truncate font-semibold">{{ fila.custodio }}</p>
        <p class="text-sm text-tierra-600 dark:text-tierra-300">
          Retiro N.º {{ fila.numero }} · {{ formatearFecha(fila.fecha) }}
        </p>
      </div>
      <p class="shrink-0 text-right">
        <span class="block text-lg font-semibold tabular-nums">{{ formatearMonto(fila.disponible) }}</span>
        <span class="block text-xs text-tierra-500 dark:text-tierra-300">disponible</span>
      </p>
    </div>
    <p class="mt-1 text-sm text-tierra-600 dark:text-tierra-300">
      {{ textoDeFormaDeRetiro(fila.forma) }} {{ fila.documento }} · retirado {{ formatearMonto(fila.monto) }} · pagado
      {{ formatearMonto(fila.pagado) }}
    </p>
    <p class="mt-2 flex flex-wrap items-center gap-2 text-sm">
      Abierto {{ textoDeDiasAbierto(fila.diasAbierto) }}
      <InsigniaBase v-if="fila.deMesAnterior" tono="trigo">De un mes anterior</InsigniaBase>
    </p>
  </TarjetaBase>
</template>
