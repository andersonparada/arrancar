<script setup lang="ts">
import { computed } from 'vue';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { terceroDelComprobante, tituloDeComprobante } from '../composables/comprobantes/detalles-de-comprobante';
import { agruparLasLineas, type LineaImpresa } from '../composables/reposiciones/impresion-de-reposicion';
import type { DesgloseDeReposicion } from '../servicios/tipos-de-reposiciones';
import DatosDeLaHoja from './DatosDeLaHoja.vue';
import HojaDeCajaChica from './HojaDeCajaChica.vue';

/**
 * La hoja de reposición: con número y cheque cuando ya se registró, o la solicitud con lo pendiente para que la firmen
 * antes de reponer. Los comprobantes van por concepto, como los recibe Bancos.
 */
const props = defineProps<{
  sello: string;
  titulo: string;
  datos: DetalleDeRegistro[];
  lineas: LineaImpresa[];
  total: string;
  desglose: DesgloseDeReposicion;
  firmas: readonly string[];
}>();

const grupos = computed(() => agruparLasLineas(props.lineas));
const partes = computed(() =>
  [
    { etiqueta: 'Gasto de operación', valor: props.desglose.operacion },
    { etiqueta: 'Compra de activo fijo', valor: props.desglose.activo },
    { etiqueta: 'Faltante de efectivo', valor: props.desglose.faltante },
  ].filter(({ valor }) => Number(valor) !== 0),
);
</script>

<template>
  <HojaDeCajaChica :sello="sello" :titulo="titulo" :firmas="firmas">
    <DatosDeLaHoja :datos="datos" />
    <section v-for="grupo in grupos" :key="grupo.titulo">
      <h3 class="mb-1 text-sm font-bold">{{ grupo.titulo }}</h3>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <caption class="sr-only">
            {{
              grupo.titulo
            }}
          </caption>
          <thead>
            <tr class="border-y-2 border-black text-left">
              <th scope="col" class="py-1 pr-2">Fecha</th>
              <th scope="col" class="py-1 pr-2">Comprobante</th>
              <th scope="col" class="py-1 text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="linea in grupo.lineas" :key="linea.comprobante.id" class="border-b border-black/40 align-top">
              <td class="py-1 pr-2 whitespace-nowrap">{{ formatearFecha(linea.comprobante.fecha) }}</td>
              <td class="py-1 pr-2 break-words">
                {{ tituloDeComprobante(linea.comprobante) }} · {{ terceroDelComprobante(linea.comprobante) }}
              </td>
              <td class="py-1 text-right whitespace-nowrap">{{ formatearMonto(linea.monto) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="font-semibold">
              <td colspan="2" class="py-1 pr-2 text-right">Subtotal</td>
              <td class="py-1 text-right whitespace-nowrap">{{ formatearMonto(grupo.subtotal) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
    <table class="ml-auto w-full max-w-sm border-collapse text-sm">
      <caption class="sr-only">
        Total a reponer
      </caption>
      <tbody>
        <tr v-for="parte in partes" :key="parte.etiqueta" class="border-b border-black/40">
          <th scope="row" class="py-1 pr-2 text-left font-normal">{{ parte.etiqueta }}</th>
          <td class="py-1 text-right">{{ formatearMonto(parte.valor) }}</td>
        </tr>
        <tr class="text-base font-bold">
          <th scope="row" class="py-1 pr-2 text-left">Total a reponer</th>
          <td class="py-1 text-right">{{ formatearMonto(total) }}</td>
        </tr>
      </tbody>
    </table>
  </HojaDeCajaChica>
</template>
