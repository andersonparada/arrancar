<script setup lang="ts">
import { formatearFecha, formatearTexto } from '@/modulos/core/utilidades/formato';
import type { Boleta } from '../../servicios/traslados.api';

/** La hoja de la boleta como se imprime: título, número, destino, activos y firmas de quien entrega y quien recibe. */
defineProps<{ boleta: Boleta; numero: string }>();

const identificacion = (renglon: Boleta['renglones'][number]): string =>
  [
    renglon.marca,
    renglon.modelo,
    renglon.numeroDeSerie && `Serie ${renglon.numeroDeSerie}`,
    renglon.placa && `Placa ${renglon.placa}`,
  ]
    .filter(Boolean)
    .join(' · ');
</script>

<template>
  <article
    class="relative mx-auto max-w-3xl space-y-5 rounded-2xl border border-tierra-200 bg-white p-4 text-tierra-900 sm:p-8 dark:border-tierra-700 dark:bg-tierra-800 dark:text-tierra-100 print:max-w-none print:rounded-none print:border-0 print:p-0"
    aria-label="Boleta de traslado"
  >
    <p
      v-if="boleta.estado === 'anulado'"
      class="rounded-lg border border-red-700 p-2 text-center text-sm font-semibold uppercase text-red-700 dark:text-red-400"
      role="status"
    >
      Boleta anulada<template v-if="boleta.motivoDeAnulacion"> · {{ boleta.motivoDeAnulacion }}</template>
    </p>
    <header class="flex flex-wrap items-baseline justify-between gap-2 border-b border-tierra-300 pb-3">
      <h2 class="text-xl font-semibold">{{ boleta.titulo }}</h2>
      <p class="text-sm tabular-nums">
        Boleta No. <strong>{{ numero }}</strong>
      </p>
    </header>

    <dl class="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      <div>
        <dt class="text-xs text-tierra-500">Fecha</dt>
        <dd>{{ formatearFecha(boleta.fecha) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-tierra-500">Destino</dt>
        <dd>
          <template v-if="boleta.aBodega">Bodega de activos · </template>{{ formatearTexto(boleta.localidadNombre) }}
          <template v-if="boleta.departamentoNombre"> · {{ boleta.departamentoNombre }}</template>
        </dd>
      </div>
      <div>
        <dt class="text-xs text-tierra-500">Responsable del bien</dt>
        <dd>{{ formatearTexto(boleta.responsable) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-tierra-500">Recibe</dt>
        <dd>{{ boleta.recibidoPor }}</dd>
      </div>
      <div class="sm:col-span-2">
        <dt class="text-xs text-tierra-500">Motivo</dt>
        <dd>{{ boleta.motivo }}</dd>
      </div>
    </dl>

    <ul
      class="divide-y divide-tierra-200 border-y border-tierra-300 text-sm dark:divide-tierra-700"
      aria-label="Activos"
    >
      <li v-for="renglon in boleta.renglones" :key="renglon.activoId" class="space-y-0.5 py-2">
        <p>
          <strong class="tabular-nums">{{ renglon.codigo }}</strong> · {{ renglon.descripcion }}
          <template v-if="renglon.cantidad > 1"> (cantidad {{ renglon.cantidad }})</template>
          <template v-if="renglon.componenteDe"> · componente de {{ renglon.componenteDe }}</template>
        </p>
        <p v-if="identificacion(renglon)" class="text-xs text-tierra-500">{{ identificacion(renglon) }}</p>
      </li>
    </ul>

    <div class="grid grid-cols-1 gap-8 pt-10 text-center text-sm sm:grid-cols-2">
      <div class="border-t border-tierra-900 pt-1 dark:border-tierra-300">Entrega</div>
      <div class="border-t border-tierra-900 pt-1 dark:border-tierra-300">Recibe: {{ boleta.recibidoPor }}</div>
    </div>
  </article>
</template>
