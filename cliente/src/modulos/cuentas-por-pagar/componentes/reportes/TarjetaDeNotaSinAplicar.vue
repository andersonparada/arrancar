<script setup lang="ts">
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearMonto, formatearTexto } from '@/modulos/core/utilidades/formato';
import { textoDeConciliada, textoDeDiasSinAplicar } from '../../composables/reportes/notas-sin-aplicar';
import type { FilaDeNotaSinAplicar } from '../../servicios/tipos-de-reportes-de-efectivo';

/** Una nota de débito sin aplicar en el celular. */
defineProps<{ fila: FilaDeNotaSinAplicar }>();
</script>

<template>
  <TarjetaBase>
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="truncate font-semibold">{{ fila.cuenta }}</p>
        <p class="text-sm text-tierra-600 dark:text-tierra-300">
          Nota N.º {{ formatearTexto(fila.numero) }} · {{ formatearFecha(fila.fecha) }}
        </p>
      </div>
      <p class="shrink-0 text-right">
        <span class="block text-lg font-semibold tabular-nums">{{ formatearMonto(fila.disponible) }}</span>
        <span class="block text-xs text-tierra-500 dark:text-tierra-300">por aplicar</span>
      </p>
    </div>
    <p class="mt-1 text-sm text-tierra-600 dark:text-tierra-300">
      {{ formatearTexto(fila.referencia) }} · monto {{ formatearMonto(fila.monto) }} · aplicado
      {{ formatearMonto(fila.aplicado) }}
    </p>
    <p class="mt-2 flex flex-wrap items-center gap-2 text-sm">
      Sin aplicar {{ textoDeDiasSinAplicar(fila.diasSinAplicar) }}
      <InsigniaBase :tono="fila.conciliada ? 'campo' : 'tierra'">{{ textoDeConciliada(fila.conciliada) }}</InsigniaBase>
    </p>
  </TarjetaBase>
</template>
