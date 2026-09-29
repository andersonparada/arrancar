<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { ResumenDeSinClasificar } from '../../servicios/movimientos.api';

/**
 * Lo que falta clasificar en la cuenta y fechas del reporte: cuántos movimientos y cuánto dinero entra y sale
 * sin concepto. Si hay pendientes, lleva a la bandeja donde se clasifican.
 */
defineProps<{ resumen: ResumenDeSinClasificar }>();
</script>

<template>
  <p
    v-if="resumen.cantidad > 0"
    class="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900"
  >
    <strong>{{ resumen.cantidad }}</strong>
    {{ resumen.cantidad === 1 ? 'movimiento sin clasificar' : 'movimientos sin clasificar' }}:
    {{ formatearMonto(resumen.montoDeEntradas) }} de entradas y {{ formatearMonto(resumen.montoDeSalidas) }} de salidas.
    <RouterLink
      v-permiso="'bancos.movimientos.ver'"
      to="/bancos/sin-clasificar"
      class="ml-1 font-medium underline underline-offset-2 print:hidden"
    >
      Clasificar
    </RouterLink>
  </p>
</template>
