<script setup lang="ts">
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearCantidad, formatearMonto } from '@/modulos/core/utilidades/formato';
import { cifrasDeLinea, nombreDeLinea } from '../../composables/documentos/detalles-de-documento';
import type { LineaDeDocumento } from '../../servicios/documentos.api';

/** `conceptos` traduce el id del concepto de gasto a su nombre; si falta alguno se muestra la descripción. */
defineProps<{ lineas: LineaDeDocumento[]; conceptos: Map<string, string> }>();
</script>

<template>
  <ul class="space-y-3">
    <li v-for="linea in lineas" :key="linea.numero">
      <TarjetaBase>
        <div class="flex flex-wrap items-start justify-between gap-2">
          <p class="min-w-0 font-medium break-words">{{ linea.numero }}. {{ nombreDeLinea(linea, conceptos) }}</p>
          <div class="flex flex-wrap gap-1.5">
            <InsigniaBase>{{ linea.tipo === 'bien' ? 'Bien' : 'Servicio' }}</InsigniaBase>
            <InsigniaBase v-if="linea.esActivoFijo" tono="trigo">Activo fijo</InsigniaBase>
          </div>
        </div>
        <p v-if="linea.combustible" class="mt-1 text-sm text-tierra-600 dark:text-tierra-300">
          Combustible: {{ formatearCantidad(linea.combustible.galones, 'gal') }} con IDP de
          {{ formatearMonto(linea.combustible.idpPorGalon) }} por galón
        </p>
        <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-6">
          <div v-for="cifra in cifrasDeLinea(linea)" :key="cifra.etiqueta" class="min-w-0">
            <dt class="text-xs text-tierra-500">{{ cifra.etiqueta }}</dt>
            <dd class="tabular-nums">{{ formatearMonto(cifra.valor) }}</dd>
          </div>
        </dl>
      </TarjetaBase>
    </li>
  </ul>
</template>
