<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { textoDeAtraso } from '../../composables/reportes/contrasenas-por-pagar';
import type { FilaDeContrasenaPorPagar } from '../../servicios/tipos-de-reportes-de-proveedor';

/** Una contraseña con pago prometido vencido en el celular: lleva a su ficha. */
defineProps<{ fila: FilaDeContrasenaPorPagar }>();
</script>

<template>
  <TarjetaBase>
    <RouterLink
      :to="{ name: 'cuentas-por-pagar.contrasenas.ficha', params: { id: fila.id } }"
      class="flex flex-col gap-1.5 rounded-lg focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none"
    >
      <span class="flex items-start justify-between gap-2">
        <span class="min-w-0">
          <span class="block truncate font-semibold">Contraseña N.º {{ fila.numero }}</span>
          <span class="block truncate text-sm text-tierra-600 dark:text-tierra-300">{{ fila.proveedorNombre }}</span>
        </span>
        <span class="flex shrink-0 items-center gap-1">
          <span class="text-lg font-semibold tabular-nums">{{ formatearMonto(fila.saldo) }}</span>
          <ChevronRight class="size-4 text-tierra-400" aria-hidden="true" />
        </span>
      </span>
      <span class="flex flex-wrap gap-1.5">
        <InsigniaBase :tono="fila.diasDeAtraso > 0 ? 'rojo' : 'tierra'">{{
          textoDeAtraso(fila.diasDeAtraso)
        }}</InsigniaBase>
        <InsigniaBase v-if="Number(fila.sinAutorizar) > 0" tono="trigo">Con saldo sin autorizar</InsigniaBase>
      </span>
      <span class="text-sm text-tierra-600 dark:text-tierra-300">
        Pago prometido {{ formatearFecha(fila.pagoPrometido) }} · {{ fila.documentosConSaldo }}
        {{ fila.documentosConSaldo === 1 ? 'documento' : 'documentos' }}
      </span>
      <span class="text-sm tabular-nums text-tierra-600 dark:text-tierra-300">
        Autorizado {{ formatearMonto(fila.autorizado) }} · Sin autorizar {{ formatearMonto(fila.sinAutorizar) }}
        <template v-if="Number(fila.comprometido) !== 0">
          · Comprometido {{ formatearMonto(fila.comprometido) }}</template
        >
      </span>
    </RouterLink>
  </TarjetaBase>
</template>
