<script setup lang="ts">
import { AlertTriangle, CheckCircle2 } from 'lucide-vue-next';
import { resumenDelCuadre } from '../../composables/flujo-de-efectivo/textos-del-flujo';
import type { ControlDeCuadre } from '../../servicios/flujo-de-efectivo.api';
import MontoDelFlujo from './MontoDelFlujo.vue';

/**
 * El control de cuadre: saldo al inicio + saldos iniciales del rango + flujo neto = saldo calculado, que debe ser
 * el saldo al final en libros. Si no cuadra, la alerta lo dice con la diferencia.
 */
defineProps<{ control: ControlDeCuadre }>();
</script>

<template>
  <section
    aria-label="Control de cuadre"
    class="rounded-2xl p-4 ring-1 sm:p-5"
    :class="
      control.cuadra
        ? 'bg-campo-50 ring-campo-200 dark:bg-campo-950/30 dark:ring-campo-900'
        : 'bg-red-50 ring-red-300 dark:bg-red-950/40 dark:ring-red-900'
    "
    :role="control.cuadra ? undefined : 'alert'"
  >
    <h3 class="flex items-center gap-2 font-semibold">
      <component :is="control.cuadra ? CheckCircle2 : AlertTriangle" class="size-5 shrink-0" aria-hidden="true" />
      {{ resumenDelCuadre(control) }}
    </h3>
    <dl class="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
      <div class="flex justify-between gap-3">
        <dt>Saldo al inicio</dt>
        <dd><MontoDelFlujo :monto="control.saldoAlInicio" /></dd>
      </div>
      <div class="flex justify-between gap-3">
        <dt>Saldos iniciales de cuentas en el rango</dt>
        <dd><MontoDelFlujo :monto="control.saldosInicialesDelRango" /></dd>
      </div>
      <div class="flex justify-between gap-3">
        <dt>Flujo neto del período</dt>
        <dd><MontoDelFlujo :monto="control.flujoNeto" /></dd>
      </div>
      <div class="flex justify-between gap-3 font-semibold">
        <dt>Saldo calculado</dt>
        <dd><MontoDelFlujo :monto="control.saldoCalculado" /></dd>
      </div>
      <div class="flex justify-between gap-3 font-semibold">
        <dt>Saldo al final en libros</dt>
        <dd><MontoDelFlujo :monto="control.saldoAlFinal" /></dd>
      </div>
      <div v-if="!control.cuadra" class="flex justify-between gap-3 font-semibold text-red-700 dark:text-red-300">
        <dt>Diferencia</dt>
        <dd><MontoDelFlujo :monto="control.diferencia" /></dd>
      </div>
    </dl>
  </section>
</template>
