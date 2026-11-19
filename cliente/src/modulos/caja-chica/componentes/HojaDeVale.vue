<script setup lang="ts">
import { computed } from 'vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { terceroDelComprobante, tituloDeComprobante } from '../composables/comprobantes/detalles-de-comprobante';
import { datosDelVale, FIRMAS_DEL_VALE } from '../composables/impresiones/datos-de-impresion';
import type { Vale } from '../servicios/tipos-de-vales';
import DatosDeLaHoja from './DatosDeLaHoja.vue';
import HojaDeCajaChica from './HojaDeCajaChica.vue';

/**
 * El vale provisional para firmar al entregar el efectivo. Ya liquidado, la misma hoja muestra los comprobantes que
 * lo justifican y lo que regresó al fondo.
 */
const props = defineProps<{ vale: Vale }>();
const datos = computed(() => datosDelVale(props.vale));
</script>

<template>
  <HojaDeCajaChica sello="Vale provisional" :titulo="`Vale provisional No. ${vale.numero}`" :firmas="FIRMAS_DEL_VALE">
    <DatosDeLaHoja :datos="datos" />
    <p class="text-sm">
      Recibí del fondo de caja chica la cantidad de <strong>{{ formatearMonto(vale.monto) }}</strong
      >, que me comprometo a justificar con los comprobantes de lo gastado y a devolver lo que sobre.
    </p>
    <div v-if="vale.comprobantes.length > 0" class="overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <caption class="mb-1 text-left text-sm font-bold">
          Comprobantes que justifican el vale
        </caption>
        <thead>
          <tr class="border-y-2 border-black text-left">
            <th scope="col" class="py-1 pr-2">Fecha</th>
            <th scope="col" class="py-1 pr-2">Comprobante</th>
            <th scope="col" class="py-1 text-right">Monto</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="comprobante in vale.comprobantes" :key="comprobante.id" class="border-b border-black/40 align-top">
            <td class="py-1 pr-2 whitespace-nowrap">{{ formatearFecha(comprobante.fecha) }}</td>
            <td class="py-1 pr-2 break-words">
              {{ tituloDeComprobante(comprobante) }} · {{ terceroDelComprobante(comprobante) }}
            </td>
            <td class="py-1 text-right whitespace-nowrap">
              {{ comprobante.resta ? '−' : '' }}{{ formatearMonto(comprobante.monto) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </HojaDeCajaChica>
</template>
