<script setup lang="ts">
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { totalesConValor } from '../../composables/documentos/detalles-de-documento';
import type { FichaDeDocumento } from '../../servicios/documentos.api';

/** Los totales por columna del libro; las columnas en cero no se muestran. */
defineProps<{ ficha: FichaDeDocumento }>();
</script>

<template>
  <TarjetaBase>
    <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
      <div v-for="columna in totalesConValor(ficha)" :key="columna.etiqueta" class="min-w-0">
        <dt class="text-xs text-tierra-500">{{ columna.etiqueta }}</dt>
        <dd class="tabular-nums">{{ formatearMonto(columna.valor) }}</dd>
      </div>
      <div class="col-span-2 min-w-0 sm:col-span-3">
        <dt class="text-xs text-tierra-500">Total</dt>
        <dd class="text-lg font-semibold tabular-nums">{{ formatearMonto(ficha.totales.total) }}</dd>
      </div>
    </dl>
  </TarjetaBase>
</template>
