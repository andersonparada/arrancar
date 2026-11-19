<script setup lang="ts">
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { tituloDeDocumento } from '../composables/detalles-de-documento';
import { hayNotasAplicadas, textoDeRetenciones } from '../composables/pagos/comprobante-de-pago';
import type { ContrasenaDelComprobante } from '../servicios/tipos-de-pagos';

/** Los documentos pagados de una contraseña: lo pagado y el saldo que queda; la retención lleva su constancia. */
defineProps<{ contrasena: ContrasenaDelComprobante }>();
const celda = 'border border-black px-2 py-1';
const celdaNumerica = `${celda} text-right tabular-nums`;
</script>

<template>
  <div class="overflow-x-auto print:overflow-visible">
    <table class="w-full border-collapse text-sm">
      <caption class="mb-1 text-left text-sm font-semibold">
        {{
          `Contraseña ${contrasena.numero}`
        }}
      </caption>
      <thead>
        <tr class="bg-neutral-200 print:bg-neutral-200">
          <th scope="col" :class="`${celda} text-left`">Documento</th>
          <th scope="col" :class="celdaNumerica">Total</th>
          <th scope="col" :class="celdaNumerica">Retenciones</th>
          <th scope="col" :class="celdaNumerica">Notas aplicadas</th>
          <th scope="col" :class="celdaNumerica">Pagado</th>
          <th scope="col" :class="celdaNumerica">Saldo que queda</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="documento in contrasena.documentos" :key="documento.documentoId">
          <td :class="celda">
            {{ tituloDeDocumento(documento) }}
            <span v-for="texto in textoDeRetenciones(documento.constancias)" :key="texto" class="mt-0.5 block text-xs">
              {{ texto }}
            </span>
          </td>
          <td :class="celdaNumerica">{{ formatearMonto(documento.total) }}</td>
          <td :class="celdaNumerica">{{ formatearMonto(documento.retenciones) }}</td>
          <td :class="celdaNumerica">
            {{ hayNotasAplicadas(documento) ? formatearMonto(documento.notasAplicadas) : '' }}
          </td>
          <td :class="`${celdaNumerica} font-semibold`">{{ formatearMonto(documento.pagado) }}</td>
          <td :class="celdaNumerica">{{ formatearMonto(documento.saldo) }}</td>
        </tr>
      </tbody>
      <tfoot v-if="contrasena.documentos.length > 1">
        <tr>
          <th scope="row" colspan="4" :class="`${celda} text-right`">
            Pagado de la contraseña {{ contrasena.numero }}
          </th>
          <td :class="`${celdaNumerica} font-semibold`">{{ formatearMonto(contrasena.pagado) }}</td>
          <td :class="celda" />
        </tr>
      </tfoot>
    </table>
  </div>
</template>
