<script setup lang="ts">
import { computed } from 'vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { terceroDelComprobante, tituloDeComprobante } from '../composables/comprobantes/detalles-de-comprobante';
import { cuadroDelArqueo, datosDelArqueo, FIRMAS_DEL_ARQUEO } from '../composables/impresiones/datos-de-impresion';
import type { Arqueo } from '../servicios/tipos-de-arqueos';
import DatosDeLaHoja from './DatosDeLaHoja.vue';
import HojaDeCajaChica from './HojaDeCajaChica.vue';

/** El acta de arqueo: el conteo por denominación, lo que esperaba el sistema, la diferencia y las firmas. */
const props = defineProps<{ arqueo: Arqueo }>();
const datos = computed(() => datosDelArqueo(props.arqueo));
const cuadro = computed(() => cuadroDelArqueo(props.arqueo));
</script>

<template>
  <HojaDeCajaChica
    sello="Acta de arqueo"
    :titulo="`Arqueo de caja chica No. ${arqueo.numero}`"
    :firmas="FIRMAS_DEL_ARQUEO"
  >
    <DatosDeLaHoja :datos="datos" />
    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <caption class="mb-1 text-left text-sm font-bold">
          Conteo del efectivo
        </caption>
        <thead>
          <tr class="border-y-2 border-black text-left">
            <th scope="col" class="py-1 pr-2">Denominación</th>
            <th scope="col" class="py-1 pr-2 text-right">Cantidad</th>
            <th scope="col" class="py-1 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="linea in arqueo.conteo" :key="linea.denominacion" class="border-b border-black/40">
            <td class="py-1 pr-2">{{ formatearMonto(linea.denominacion) }}</td>
            <td class="py-1 pr-2 text-right">{{ linea.cantidad }}</td>
            <td class="py-1 text-right">{{ formatearMonto(linea.subtotal) }}</td>
          </tr>
          <tr v-if="arqueo.conteo.length === 0">
            <td colspan="3" class="py-1">No se contó efectivo.</td>
          </tr>
        </tbody>
      </table>
    </div>
    <table class="ml-auto w-full max-w-sm border-collapse text-sm">
      <caption class="sr-only">
        Resultado del arqueo
      </caption>
      <tbody>
        <tr v-for="fila in cuadro" :key="fila.etiqueta" class="border-b border-black/40">
          <th scope="row" class="py-1 pr-2 text-left font-normal">{{ fila.etiqueta }}</th>
          <td class="py-1 text-right font-semibold">{{ fila.valor }}</td>
        </tr>
      </tbody>
    </table>
    <p v-if="arqueo.motivoDeDiferencia" class="text-sm">
      <strong>Motivo de la diferencia:</strong> {{ arqueo.motivoDeDiferencia }}
      <template v-if="arqueo.destinoDelFaltante">
        · {{ arqueo.destinoDelFaltante === 'perdida' ? 'Se asume como pérdida' : 'Se cobra al custodio' }}
      </template>
    </p>
    <p v-if="arqueo.comprobante" class="text-sm">
      <strong>Comprobante generado:</strong> {{ tituloDeComprobante(arqueo.comprobante) }} ·
      {{ terceroDelComprobante(arqueo.comprobante) }} · {{ formatearMonto(arqueo.comprobante.monto) }}
    </p>
    <p v-if="arqueo.observaciones" class="text-sm"><strong>Observaciones:</strong> {{ arqueo.observaciones }}</p>
  </HojaDeCajaChica>
</template>
