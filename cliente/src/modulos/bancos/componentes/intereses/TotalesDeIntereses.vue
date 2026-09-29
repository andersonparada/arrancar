<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { ReporteDeIntereses } from '../../servicios/intereses.api';

/** Los totales del período: bruto, ISR retenido y neto acreditado, por cuenta y en total, y el aviso de lo que falta. */
defineProps<{ reporte: ReporteDeIntereses }>();
</script>

<template>
  <section aria-label="Totales de intereses" class="space-y-3">
    <div
      v-if="reporte.notasSinDatos > 0"
      role="alert"
      class="flex items-start gap-2 rounded-lg bg-trigo-300/30 p-3 text-sm text-tierra-800 print:hidden dark:text-trigo-300"
    >
      <TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>
        {{ reporte.notasSinDatos }}
        {{ reporte.notasSinDatos === 1 ? 'nota tiene' : 'notas tienen' }} un concepto de intereses pero no el interés
        bruto ni el ISR, así que no entran aquí. Corrígelas en Notas para completar la declaración.
      </p>
    </div>
    <dl class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-2xl bg-white p-4 ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700">
        <dt class="text-xs tracking-wide text-tierra-500 uppercase">Interés bruto</dt>
        <dd class="text-lg font-semibold">{{ formatearMonto(reporte.interesBruto) }}</dd>
      </div>
      <div class="rounded-2xl bg-white p-4 ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700">
        <dt class="text-xs tracking-wide text-tierra-500 uppercase">ISR retenido</dt>
        <dd class="text-lg font-semibold">{{ formatearMonto(reporte.isrRetenido) }}</dd>
      </div>
      <div class="rounded-2xl bg-white p-4 ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700">
        <dt class="text-xs tracking-wide text-tierra-500 uppercase">Neto acreditado</dt>
        <dd class="text-lg font-semibold">{{ formatearMonto(reporte.neto) }}</dd>
      </div>
    </dl>
    <div
      v-if="reporte.porCuenta.length > 1"
      class="overflow-x-auto rounded-2xl bg-white ring-1 ring-tierra-200/70 print:overflow-visible dark:bg-tierra-800/60 dark:ring-tierra-700"
    >
      <table class="w-full min-w-[32rem] text-left text-sm">
        <caption class="sr-only">
          Totales por cuenta
        </caption>
        <thead
          class="border-b border-tierra-100 text-xs tracking-wide text-tierra-500 uppercase dark:border-tierra-700"
        >
          <tr>
            <th scope="col" class="px-4 py-3 font-medium">Cuenta</th>
            <th scope="col" class="px-4 py-3 text-right font-medium">Notas</th>
            <th scope="col" class="px-4 py-3 text-right font-medium">Bruto</th>
            <th scope="col" class="px-4 py-3 text-right font-medium">ISR</th>
            <th scope="col" class="px-4 py-3 text-right font-medium">Neto</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
          <tr v-for="cuenta in reporte.porCuenta" :key="cuenta.cuentaBancariaId">
            <td class="px-4 py-2.5">{{ cuenta.cuentaBancariaNombre }}</td>
            <td class="px-4 py-2.5 text-right">{{ cuenta.cantidad }}</td>
            <td class="px-4 py-2.5 text-right whitespace-nowrap">{{ formatearMonto(cuenta.interesBruto) }}</td>
            <td class="px-4 py-2.5 text-right whitespace-nowrap">{{ formatearMonto(cuenta.isrRetenido) }}</td>
            <td class="px-4 py-2.5 text-right whitespace-nowrap">{{ formatearMonto(cuenta.neto) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
