<script setup lang="ts">
import { computed } from 'vue';
import { formatearFecha, formatearMonto, formatearNit } from '@/modulos/core/utilidades/formato';
import {
  descripcionDelMedio,
  etiquetaDeLaNota,
  lineasDeLaEmpresa,
} from '../composables/reintegros/recibo-de-reintegro';
import type { ReciboDeReintegro } from '../servicios/tipos-de-reintegros';

/**
 * El recibo de reintegro en una hoja carta, siempre blanca con letra negra (también en modo oscuro). «ANULADO» es texto,
 * no color, para que se entienda en blanco y negro.
 */
const props = defineProps<{ recibo: ReciboDeReintegro }>();
const empresa = computed(() => lineasDeLaEmpresa(props.recibo.empresa));
const linea = 'mt-10 border-t border-black pt-1 text-xs';
</script>

<template>
  <article
    class="hoja mx-auto w-full max-w-[8.5in] space-y-4 bg-white p-4 text-black ring-1 ring-tierra-300 sm:p-8 print:max-w-none print:p-0 print:ring-0"
    aria-label="Recibo de reintegro"
  >
    <header class="flex flex-wrap items-start justify-between gap-2 border-b-2 border-black pb-2">
      <div>
        <p class="text-lg font-bold">{{ empresa.principal }}</p>
        <p v-if="empresa.comercial" class="text-sm">{{ empresa.comercial }}</p>
        <p v-if="recibo.empresa.nit" class="text-sm">NIT {{ formatearNit(recibo.empresa.nit) }}</p>
      </div>
      <p class="border-2 border-black px-3 py-1 text-sm font-bold tracking-wide">RECIBO DE REINTEGRO</p>
    </header>

    <p v-if="recibo.estado === 'anulado'" class="border-4 border-double border-black p-2 text-center text-xl font-bold">
      ANULADO
    </p>

    <h2 class="text-xl font-bold">Recibo de reintegro No. {{ recibo.numero }}</h2>

    <dl class="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
      <div>
        <dt class="inline font-semibold">Proveedor:</dt>
        <dd class="ml-1 inline">{{ recibo.proveedor.nombre }}</dd>
      </div>
      <div v-if="recibo.proveedor.nit">
        <dt class="inline font-semibold">NIT:</dt>
        <dd class="ml-1 inline">{{ formatearNit(recibo.proveedor.nit) }}</dd>
      </div>
      <div>
        <dt class="inline font-semibold">Fecha:</dt>
        <dd class="ml-1 inline">{{ formatearFecha(recibo.fecha) }}</dd>
      </div>
      <div class="sm:col-span-2">
        <dt class="inline font-semibold">Forma:</dt>
        <dd class="ml-1 inline">{{ descripcionDelMedio(recibo) }}</dd>
      </div>
    </dl>

    <table class="w-full border-collapse text-sm">
      <caption class="sr-only">
        Notas de crédito que se reintegraron
      </caption>
      <thead>
        <tr class="border-y-2 border-black text-left">
          <th scope="col" class="py-1 pr-2">Nota de crédito</th>
          <th scope="col" class="py-1 text-right">Monto devuelto</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="nota in recibo.notas" :key="`${nota.serie}-${nota.numero}`" class="border-b border-black/40">
          <td class="py-1 pr-2">{{ etiquetaDeLaNota(nota) }}</td>
          <td class="py-1 text-right">{{ formatearMonto(nota.monto) }}</td>
        </tr>
      </tbody>
    </table>

    <p class="text-lg font-bold">Total recibido {{ formatearMonto(recibo.total) }}</p>
    <p class="text-sm">Son: {{ recibo.totalEnLetras }}</p>

    <div class="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2 print:grid-cols-2">
      <p :class="linea">Recibido por ({{ recibo.recibidoPor }}): nombre, firma y fecha</p>
      <p :class="linea">Entregado por ({{ recibo.entregadoPor }}): nombre, firma y fecha</p>
    </div>

    <p class="border-t border-black pt-2 text-xs font-semibold">{{ recibo.leyenda }}</p>
  </article>
</template>
