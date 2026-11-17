<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { textoDeAntiguedad, tituloDeLaNota } from '../../composables/reportes/saldos-a-favor';
import type { FilaDeSaldoAFavor } from '../../servicios/tipos-de-reportes-de-proveedor';

/** Una nota con saldo a favor en el celular: lleva a su ficha. */
defineProps<{ fila: FilaDeSaldoAFavor }>();
</script>

<template>
  <TarjetaBase>
    <RouterLink
      :to="{ name: 'cuentas-por-pagar.documentos.ficha', params: { documentoId: fila.id } }"
      class="flex flex-col gap-1.5 rounded-lg focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none"
    >
      <span class="flex items-start justify-between gap-2">
        <span class="min-w-0">
          <span class="block truncate font-semibold">{{ tituloDeLaNota(fila) }}</span>
          <span class="block truncate text-sm text-tierra-600 dark:text-tierra-300">{{ fila.proveedorNombre }}</span>
        </span>
        <span class="flex shrink-0 items-center gap-1">
          <span class="text-lg font-semibold tabular-nums">{{ formatearMonto(fila.saldoLibre) }}</span>
          <ChevronRight class="size-4 text-tierra-400" aria-hidden="true" />
        </span>
      </span>
      <span class="flex flex-wrap gap-1.5">
        <InsigniaBase :tono="fila.posiblementePrescrito ? 'rojo' : 'tierra'">
          {{ textoDeAntiguedad(fila) }} sin movimiento
        </InsigniaBase>
        <InsigniaBase v-if="fila.enContrasena" tono="trigo">En una contraseña</InsigniaBase>
      </span>
      <span class="text-sm text-tierra-600 dark:text-tierra-300">
        Último movimiento {{ formatearFecha(fila.ultimoMovimiento) }}
      </span>
      <span class="text-sm text-tierra-600 dark:text-tierra-300">
        Posible prescripción desde {{ formatearFecha(fila.posiblePrescripcionDesde) }}
      </span>
    </RouterLink>
  </TarjetaBase>
</template>
