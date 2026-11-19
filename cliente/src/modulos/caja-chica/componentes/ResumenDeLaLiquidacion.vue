<script setup lang="ts">
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { CuadroDeLaLiquidacion } from '../composables/vales/edicion-de-liquidacion';

/** El vale frente a lo que lo justifica: cuánto se entregó, cuánto se gastó y cuánto regresa al fondo. */
defineProps<{ monto: string; cuadro: CuadroDeLaLiquidacion }>();
</script>

<template>
  <TarjetaBase class="space-y-2" aria-live="polite">
    <dl class="space-y-1 text-sm">
      <div class="flex justify-between gap-3">
        <dt>Efectivo entregado</dt>
        <dd class="tabular-nums">{{ formatearMonto(monto) }}</dd>
      </div>
      <div class="flex justify-between gap-3">
        <dt>
          Gastado ({{ cuadro.documentos }} documento{{ cuadro.documentos === 1 ? '' : 's' }},
          {{ cuadro.gastosSinFactura }} sin factura)
        </dt>
        <dd class="tabular-nums">{{ formatearMonto(cuadro.gastado) }}</dd>
      </div>
    </dl>
    <p class="border-t border-tierra-200 pt-2 dark:border-tierra-700">
      <span class="block text-xs text-tierra-500">Regresa al fondo</span>
      <span class="text-3xl font-semibold tabular-nums">{{ formatearMonto(cuadro.devuelto) }}</span>
    </p>
    <p v-if="Number(cuadro.deMas) > 0" class="text-sm text-tierra-700 dark:text-trigo-300" role="note">
      Se gastó {{ formatearMonto(cuadro.deMas) }} más de lo entregado: esa diferencia salió del efectivo del fondo.
    </p>
    <p class="text-xs text-tierra-500">El servidor confirma estas cifras al liquidar.</p>
  </TarjetaBase>
</template>
