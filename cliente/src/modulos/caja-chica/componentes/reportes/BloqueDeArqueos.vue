<script setup lang="ts">
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFechaHora, formatearMonto } from '@/modulos/core/utilidades/formato';
import { TEXTOS_DE_RESULTADO_DE_ARQUEO, TEXTOS_DE_DESTINO_DEL_FALTANTE } from '../../textos';
import type { FondoDeArqueos } from '../../servicios/tipos-de-reportes';

/** Los arqueos de un fondo en CC-R5: contado, esperado, diferencia y, si faltó, su destino. */
defineProps<{ fondo: FondoDeArqueos }>();
</script>

<template>
  <TarjetaBase class="print:break-inside-avoid print:shadow-none">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h2 class="font-semibold">{{ fondo.fondoNombre }}</h2>
      <p class="text-xs tabular-nums text-tierra-500 dark:text-tierra-300">
        {{ fondo.cantidad }} {{ fondo.cantidad === 1 ? 'arqueo' : 'arqueos' }} · faltantes
        {{ formatearMonto(fondo.faltantes) }} · sobrantes {{ formatearMonto(fondo.sobrantes) }}
      </p>
    </div>
    <ul class="mt-3 divide-y divide-tierra-100 text-sm dark:divide-tierra-700">
      <li v-for="fila in fondo.filas" :key="fila.id" class="space-y-1 py-2">
        <div class="flex flex-wrap items-baseline justify-between gap-x-4">
          <span class="font-medium">Arqueo {{ fila.numero }} · {{ fila.custodio }}</span>
          <span class="font-semibold tabular-nums">
            {{ TEXTOS_DE_RESULTADO_DE_ARQUEO[fila.resultado] }}
            <template v-if="fila.resultado !== 'cuadrado'">{{ formatearMonto(fila.diferencia) }}</template>
          </span>
        </div>
        <p class="tabular-nums text-tierra-600 dark:text-tierra-300">
          {{ formatearFechaHora(fila.realizadoEn) }} · contado {{ formatearMonto(fila.efectivoContado) }} · esperado
          {{ formatearMonto(fila.efectivoEsperado) }}
        </p>
        <p v-if="fila.destino" class="text-tierra-600 dark:text-tierra-300">
          Destino del faltante: {{ TEXTOS_DE_DESTINO_DEL_FALTANTE[fila.destino] }}
        </p>
        <p v-if="fila.motivo" class="text-tierra-600 dark:text-tierra-300">{{ fila.motivo }}</p>
      </li>
    </ul>
  </TarjetaBase>
</template>
