<script setup lang="ts">
import { formatearFecha, formatearMonto, formatearTexto } from '@/modulos/core/utilidades/formato';
import { ETIQUETA_DE_CATEGORIA } from '../../composables/saldos-por-cuenta/textos-de-saldos';
import type { PartidaEnTransito } from '../../servicios/saldos-por-cuenta.api';

/** El detalle desplegable de lo que el banco aún no ha visto. */
defineProps<{ partidas: PartidaEnTransito[] }>();

const descripcion = (partida: PartidaEnTransito): string =>
  partida.tipo === 'cheque' ? `Cheque No. ${partida.numeroDeCheque ?? ''}` : ETIQUETA_DE_CATEGORIA[partida.categoria];
</script>

<template>
  <details v-if="partidas.length" class="mt-3 text-sm">
    <summary class="cursor-pointer font-medium text-campo-700 print:hidden dark:text-campo-300">
      Ver las {{ partidas.length }} partidas en tránsito
    </summary>
    <ul class="mt-2 divide-y divide-tierra-100 dark:divide-tierra-700">
      <li v-for="partida in partidas" :key="partida.movimientoId" class="flex flex-wrap justify-between gap-x-4 py-1.5">
        <span class="min-w-0">
          {{ formatearFecha(partida.fecha) }} · {{ descripcion(partida) }}
          <span class="block text-xs break-words text-tierra-500">
            {{ ETIQUETA_DE_CATEGORIA[partida.categoria] }} —
            {{ formatearTexto(partida.beneficiario ?? partida.referencia) }}
            <template v-if="partida.parteDeApertura"> — De la carga inicial</template>
          </span>
        </span>
        <span class="whitespace-nowrap tabular-nums">{{ formatearMonto(partida.monto) }}</span>
      </li>
    </ul>
  </details>
</template>
