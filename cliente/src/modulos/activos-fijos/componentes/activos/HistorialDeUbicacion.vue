<script setup lang="ts">
import { RouterLink } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearTexto } from '@/modulos/core/utilidades/formato';
import { numeroDeBoleta } from '../../composables/traslados/edicion-de-traslado';
import type { Traslado } from '../../servicios/activos.api';

/**
 * El historial de ubicación del activo: la primera fila es el alta; después, cada traslado, con su boleta para
 * verla e imprimirla y, si sigue vigente, para anularla.
 */
defineProps<{ traslados: Traslado[] }>();
const emit = defineEmits<{ anular: [traslado: Traslado] }>();
</script>

<template>
  <TarjetaBase>
    <h2 class="mb-3 text-sm font-semibold text-tierra-600 dark:text-tierra-300">Historial de ubicación</h2>
    <ul class="divide-y divide-tierra-200 text-sm dark:divide-tierra-700">
      <li
        v-for="traslado in traslados"
        :key="traslado.id"
        class="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2"
        :class="{ 'opacity-60': traslado.estado === 'anulado' }"
      >
        <span class="w-28 shrink-0 text-tierra-500">{{ formatearFecha(traslado.fecha) }}</span>
        <span class="min-w-0 flex-1">
          {{ formatearTexto(traslado.localidadNombre) }}
          <template v-if="traslado.departamentoNombre"> · {{ traslado.departamentoNombre }}</template>
          <template v-if="traslado.responsable"> · {{ traslado.responsable }}</template>
          <template v-if="traslado.aBodega"> · En bodega de activos</template>
          <template v-if="traslado.estado === 'anulado'">
            · Anulado<template v-if="traslado.motivoDeAnulacion">: {{ traslado.motivoDeAnulacion }}</template>
          </template>
        </span>
        <span class="text-xs text-tierra-500">{{ traslado.esAlta ? 'Alta' : formatearTexto(traslado.motivo) }}</span>
        <span v-if="traslado.grupoId && traslado.numero !== null && traslado.anioDeNumero !== null" class="flex gap-2">
          <RouterLink
            :to="{ name: 'activos-fijos.boleta', params: { grupoId: traslado.grupoId } }"
            class="text-xs font-medium text-campo-700 underline dark:text-campo-300"
          >
            Boleta {{ numeroDeBoleta(traslado.numero, traslado.anioDeNumero) }}
          </RouterLink>
          <BotonBase
            v-if="traslado.estado === 'vigente'"
            v-permiso="'activos-fijos.traslados.anular'"
            variante="fantasma"
            pequeno
            @click="emit('anular', traslado)"
          >
            Anular
          </BotonBase>
        </span>
      </li>
    </ul>
  </TarjetaBase>
</template>
