<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next';
import { useId } from 'vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import type { DetalleDeConcepto as Detalle } from '../../composables/movimientos-por-concepto/usar-detalles-por-concepto';
import type { ConceptoDelReporte } from '../../servicios/movimientos-por-concepto.api';
import MontoDelFlujo from '../flujo-de-efectivo/MontoDelFlujo.vue';
import DetalleDeConcepto from './DetalleDeConcepto.vue';

/** Un concepto del reporte con sus totales; al abrirlo muestra el detalle de sus movimientos. */
defineProps<{ concepto: ConceptoDelReporte; detalle?: Detalle }>();
defineEmits<{ alternar: [] }>();
const idDelDetalle = useId();
</script>

<template>
  <tr>
    <th scope="row" class="px-4 py-2.5 font-normal">
      <button
        type="button"
        class="flex min-h-9 items-center gap-1.5 rounded text-left font-medium hover:underline focus-visible:ring-2 focus-visible:ring-campo-500"
        :aria-expanded="!!detalle"
        :aria-controls="idDelDetalle"
        @click="$emit('alternar')"
      >
        <ChevronRight
          class="size-4 shrink-0 transition-transform"
          :class="detalle ? 'rotate-90' : ''"
          aria-hidden="true"
        />
        {{ concepto.conceptoNombre }}
        <InsigniaBase v-if="concepto.esDeSistema">Del sistema</InsigniaBase>
      </button>
    </th>
    <td class="px-4 py-2.5 text-right"><MontoDelFlujo :monto="concepto.entradas" /></td>
    <td class="px-4 py-2.5 text-right"><MontoDelFlujo :monto="concepto.salidas" /></td>
    <td class="px-4 py-2.5 text-right"><MontoDelFlujo :monto="concepto.neto" /></td>
    <td class="px-4 py-2.5 text-right">{{ concepto.cantidad }}</td>
    <td class="px-4 py-2.5 text-right">{{ concepto.cantidadDeInversos }}</td>
  </tr>
  <tr v-if="detalle" :id="idDelDetalle" class="bg-tierra-50/60 dark:bg-tierra-900/40">
    <td colspan="6" class="p-0"><DetalleDeConcepto :detalle="detalle" /></td>
  </tr>
</template>
