<script setup lang="ts">
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import type { BloqueDeMes } from '../../composables/retenciones/datos-de-constancias-pendientes';

/** El mes y grupo de un bloque: cuándo vence su entero, si ya se enteró y cuánto falta de constancia. */
defineProps<{ bloque: BloqueDeMes }>();
</script>

<template>
  <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
    <div class="min-w-0">
      <h3 class="font-semibold">{{ bloque.titulo }} · {{ bloque.nombreDelGrupo }}</h3>
      <p class="text-sm text-tierra-600 dark:text-tierra-300">
        Entero hasta el {{ formatearFecha(bloque.plazoDelGrupo) }} ·
        <InsigniaBase :tono="bloque.entero.tono">{{ bloque.entero.texto }}</InsigniaBase>
        <template v-if="bloque.entero.texto !== 'Enterado'"> {{ bloque.textoDelPlazo }}</template>
      </p>
    </div>
    <p class="text-sm tabular-nums">
      {{ bloque.cantidad }} {{ bloque.cantidad === 1 ? 'retención' : 'retenciones' }} ·
      <span class="font-semibold">{{ formatearMonto(bloque.retenido) }}</span>
    </p>
  </div>
</template>
