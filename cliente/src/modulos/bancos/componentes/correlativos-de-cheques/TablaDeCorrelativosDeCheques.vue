<script setup lang="ts">
import { formatearFecha, formatearMonto, formatearTexto } from '@/modulos/core/utilidades/formato';
import {
  esAlerta,
  textoDeImpreso,
  textoDelEstado,
} from '../../composables/correlativos-de-cheques/resumen-de-correlativos-de-cheques';
import type { NumeroDeCheque } from '../../servicios/correlativos-de-cheques.api';

/**
 * Todos los números de la chequera, uno por renglón. En el celular cada número es una tarjeta (sin desplazamiento
 * horizontal); en pantalla ancha y en papel, una tabla. Un número sin fila del rango se marca con texto, no solo con color.
 */
defineProps<{ cheques: NumeroDeCheque[] }>();
const celda = 'px-2 py-1.5 align-top';
const destacar = (numero: NumeroDeCheque): string =>
  esAlerta(numero) ? 'font-semibold text-red-700 dark:text-red-400' : '';
</script>

<template>
  <div>
    <table class="hidden w-full text-left text-sm md:table print:table print:text-xs">
      <caption class="sr-only">
        Números de la chequera
      </caption>
      <thead class="border-b border-tierra-300 text-xs text-tierra-600 dark:border-tierra-600 dark:text-tierra-300">
        <tr>
          <th :class="celda" scope="col">Número</th>
          <th :class="celda" scope="col">Estado</th>
          <th :class="celda" scope="col">Fecha</th>
          <th :class="celda" scope="col">Beneficiario</th>
          <th :class="[celda, 'text-right']" scope="col">Monto</th>
          <th :class="celda" scope="col">Impreso</th>
          <th :class="celda" scope="col">Motivo de anulación</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="numero in cheques"
          :key="numero.numero"
          class="border-b border-tierra-200 break-inside-avoid dark:border-tierra-700"
          :class="destacar(numero)"
        >
          <th :class="[celda, 'font-semibold tabular-nums']" scope="row">{{ numero.numero }}</th>
          <td :class="celda">{{ textoDelEstado(numero) }}</td>
          <td :class="celda">{{ numero.fecha ? formatearFecha(numero.fecha) : '' }}</td>
          <td :class="celda">{{ formatearTexto(numero.beneficiario) }}</td>
          <td :class="[celda, 'text-right tabular-nums']">{{ numero.monto ? formatearMonto(numero.monto) : '' }}</td>
          <td :class="celda">{{ numero.estado === 'emitido' ? textoDeImpreso(numero) : '' }}</td>
          <td :class="celda">{{ formatearTexto(numero.motivoDeAnulacion) }}</td>
        </tr>
      </tbody>
    </table>

    <ul class="space-y-2 md:hidden print:hidden">
      <li
        v-for="numero in cheques"
        :key="numero.numero"
        class="rounded-xl bg-white p-3 ring-1 ring-tierra-200 dark:bg-tierra-800/60 dark:ring-tierra-700"
        :class="destacar(numero)"
      >
        <p class="font-semibold tabular-nums">Cheque {{ numero.numero }}</p>
        <p class="text-sm">{{ textoDelEstado(numero) }}</p>
        <p v-if="numero.beneficiario" class="text-sm">
          {{ numero.fecha ? `${formatearFecha(numero.fecha)} · ` : '' }}{{ numero.beneficiario }}
          <span v-if="numero.monto" class="tabular-nums"> · {{ formatearMonto(numero.monto) }}</span>
        </p>
        <p v-if="numero.estado === 'emitido'" class="text-xs text-tierra-500">Impreso: {{ textoDeImpreso(numero) }}</p>
        <p v-if="numero.motivoDeAnulacion" class="text-xs">Motivo: {{ numero.motivoDeAnulacion }}</p>
      </li>
    </ul>
  </div>
</template>
