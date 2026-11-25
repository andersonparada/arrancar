<script setup lang="ts">
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { cifrasDeLinea, clasificacionDeLinea } from '../../composables/documentos/detalles-de-documento';
import type { LineaDeLaFicha } from '../../servicios/documentos.api';

/** Las líneas de la ficha con su base, IVA y total. */
defineProps<{ lineas: LineaDeLaFicha[] }>();
</script>

<template>
  <ul class="space-y-3">
    <li v-for="linea in lineas" :key="linea.id">
      <TarjetaBase>
        <div class="flex flex-wrap items-start justify-between gap-2">
          <p class="min-w-0 font-medium break-words">{{ linea.orden }}. {{ linea.conceptoDeIngresoNombre }}</p>
          <InsigniaBase>{{ clasificacionDeLinea(linea) }}</InsigniaBase>
        </div>
        <p v-if="linea.descripcion" class="mt-1 text-sm break-words text-tierra-600 dark:text-tierra-300">
          {{ linea.descripcion }}
        </p>
        <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          <div v-for="cifra in cifrasDeLinea(linea)" :key="cifra.etiqueta" class="min-w-0">
            <dt class="text-xs text-tierra-500">{{ cifra.etiqueta }}</dt>
            <dd class="tabular-nums">{{ formatearMonto(cifra.valor) }}</dd>
          </div>
        </dl>
      </TarjetaBase>
    </li>
  </ul>
</template>
