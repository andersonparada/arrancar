<script setup lang="ts">
import { CLASE_DE_TIPO, SIGNO_DE_TIPO } from '../../composables/movimientos/estilo-de-tipo';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import { Inbox } from 'lucide-vue-next';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import {
  avisoDeCheque,
  ROTULO_DE_CARGA_INICIAL,
  TITULO_DE_POSFECHADOS,
} from '../../composables/conciliaciones/textos-de-carga-inicial';
import type { MovimientoConMarca } from '../../servicios/conciliaciones.api';

/** Los candidatos: fecha, referencia/beneficiario (con el número si es cheque) y monto, con su casilla de marcar. */
defineProps<{ movimientos: MovimientoConMarca[]; editable: boolean; posfechados?: boolean }>();
const emit = defineEmits<{ alternar: [movimientoId: string] }>();

const descripcion = (m: MovimientoConMarca): string =>
  m.tipo === 'cheque'
    ? `Cheque ${m.numeroDeCheque ?? ''} · ${m.beneficiario ?? ''}`
    : (m.beneficiario ?? m.referencia ?? '—');
</script>

<template>
  <template v-if="posfechados && !movimientos.length" />
  <EstadoVacio v-else-if="!movimientos.length" :icono="Inbox" titulo="No hay documentos para marcar en este mes" />
  <TarjetaBase v-else class="divide-y divide-tierra-100 p-0 dark:divide-tierra-800">
    <p v-if="posfechados" class="px-4 py-3 text-sm font-semibold">{{ TITULO_DE_POSFECHADOS }}</p>
    <label
      v-for="movimiento in movimientos"
      :key="movimiento.id"
      class="flex items-start gap-3 px-4 py-3 text-sm"
      :class="editable ? 'cursor-pointer hover:bg-tierra-50 dark:hover:bg-tierra-800/50' : ''"
    >
      <input
        type="checkbox"
        class="size-4 rounded border-tierra-300 text-campo-600 focus:ring-campo-500"
        :checked="movimiento.marcado"
        :disabled="!editable"
        @change="emit('alternar', movimiento.id)"
      />
      <span class="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-start sm:gap-3">
        <span class="shrink-0 text-xs text-tierra-500 sm:w-24 sm:text-sm">{{ formatearFecha(movimiento.fecha) }}</span>
        <span class="min-w-0 flex-1 space-y-1">
          <span class="block break-words">{{ descripcion(movimiento) }}</span>
          <InsigniaBase v-if="movimiento.parteDeApertura">{{ ROTULO_DE_CARGA_INICIAL }}</InsigniaBase>
          <span v-if="posfechados && editable" class="block text-xs text-tierra-600 dark:text-tierra-300">
            {{ avisoDeCheque(movimiento.fecha) }}
          </span>
        </span>
      </span>
      <span class="shrink-0 whitespace-nowrap font-semibold" :class="CLASE_DE_TIPO[movimiento.tipo]">
        {{ SIGNO_DE_TIPO[movimiento.tipo] }} {{ formatearMonto(movimiento.monto) }}
      </span>
    </label>
  </TarjetaBase>
</template>
