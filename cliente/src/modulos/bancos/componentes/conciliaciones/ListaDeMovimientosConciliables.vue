<script setup lang="ts">
import { CLASE_DE_TIPO, SIGNO_DE_TIPO } from '../../composables/movimientos/detalles-de-movimiento';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import { Inbox } from 'lucide-vue-next';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import type { MovimientoConMarca } from '../../servicios/conciliaciones.api';

/** Los movimientos candidatos: fecha, tipo, referencia, beneficiario y monto, con su casilla de marcar. */
defineProps<{ movimientos: MovimientoConMarca[]; cerrada: boolean }>();
const emit = defineEmits<{ alternar: [movimientoId: string] }>();
</script>

<template>
  <EstadoVacio v-if="!movimientos.length" :icono="Inbox" titulo="No hay movimientos para marcar en este mes" />
  <TarjetaBase v-else class="divide-y divide-tierra-100 p-0 dark:divide-tierra-800">
    <label
      v-for="movimiento in movimientos"
      :key="movimiento.id"
      class="flex items-center gap-3 px-4 py-3 text-sm"
      :class="cerrada ? '' : 'cursor-pointer hover:bg-tierra-50 dark:hover:bg-tierra-800/50'"
    >
      <input
        type="checkbox"
        class="size-4 rounded border-tierra-300 text-campo-600 focus:ring-campo-500"
        :checked="movimiento.marcado"
        :disabled="cerrada"
        @change="emit('alternar', movimiento.id)"
      />
      <span class="w-24 shrink-0 text-tierra-500">{{ formatearFecha(movimiento.fecha) }}</span>
      <span class="min-w-0 flex-1 truncate">{{ movimiento.beneficiario ?? movimiento.referencia ?? '—' }}</span>
      <span class="font-semibold" :class="CLASE_DE_TIPO[movimiento.tipo]">
        {{ SIGNO_DE_TIPO[movimiento.tipo] }} {{ formatearMonto(movimiento.monto) }}
      </span>
    </label>
  </TarjetaBase>
</template>
