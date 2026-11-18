<script setup lang="ts">
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearMonto, formatearTexto } from '@/modulos/core/utilidades/formato';
import { textoDeCobro, textoDeDiasQueFaltan } from '../../composables/reportes/cheques-posfechados';
import type { FilaDeChequePosfechado } from '../../servicios/tipos-de-reportes-de-pagos';

/** Un cheque posfechado en el celular. */
defineProps<{ fila: FilaDeChequePosfechado }>();
</script>

<template>
  <TarjetaBase>
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="truncate font-semibold">{{ fila.proveedorNombre }}</p>
        <p class="text-sm text-tierra-600 dark:text-tierra-300">
          {{ formatearFecha(fila.fecha) }} · {{ textoDeDiasQueFaltan(fila.diasQueFaltan) }}
        </p>
      </div>
      <p class="shrink-0 text-lg font-semibold tabular-nums">{{ formatearMonto(fila.monto) }}</p>
    </div>
    <p class="mt-1 text-sm text-tierra-600 dark:text-tierra-300">
      {{ formatearTexto(fila.cuenta) }} · cheque {{ formatearTexto(fila.numeroDeCheque) }} · pago N.º
      {{ fila.numeroDelPago }}
    </p>
    <InsigniaBase class="mt-2" :tono="fila.cobrado ? 'trigo' : 'tierra'">{{ textoDeCobro(fila) }}</InsigniaBase>
  </TarjetaBase>
</template>
