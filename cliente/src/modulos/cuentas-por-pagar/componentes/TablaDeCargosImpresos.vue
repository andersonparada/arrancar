<script setup lang="ts">
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import {
  nombreDeCargoImpreso,
  retencionPorEmitirDe,
  textoAlDia,
} from '../composables/contrasenas/impresion-de-contrasena';
import type { ImpresionDeContrasena } from '../servicios/tipos-de-contrasenas';

/** Los cargos en el papel: total y retenciones son fijos; rebajado, pagado y saldo son de ese día y así se rotulan; comprometido es parte del saldo. */
defineProps<{ impresion: ImpresionDeContrasena }>();
const celda = 'border border-black px-2 py-1';
const celdaNumerica = `${celda} text-right tabular-nums`;
</script>

<template>
  <div class="overflow-x-auto print:overflow-visible">
    <table class="w-full border-collapse text-sm">
      <caption class="sr-only">
        Documentos de la contraseña
      </caption>
      <thead>
        <tr class="bg-neutral-200 print:bg-neutral-200">
          <th scope="col" :class="`${celda} text-left`">Documento</th>
          <th scope="col" :class="`${celda} text-left`">Emisión</th>
          <th scope="col" :class="celdaNumerica">Total</th>
          <th scope="col" :class="celdaNumerica">Retenciones</th>
          <th scope="col" :class="celdaNumerica">Rebajado {{ textoAlDia(impresion.alDia) }}</th>
          <th scope="col" :class="celdaNumerica">Pagado {{ textoAlDia(impresion.alDia) }}</th>
          <th scope="col" :class="celdaNumerica">Comprometido</th>
          <th scope="col" :class="celdaNumerica">Saldo {{ textoAlDia(impresion.alDia) }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="cargo in impresion.cargos" :key="cargo.documentoId">
          <td :class="celda">
            {{ nombreDeCargoImpreso(cargo) }}
            <span v-if="retencionPorEmitirDe(impresion, cargo.documentoId)" class="mt-0.5 block text-xs font-semibold">
              {{ retencionPorEmitirDe(impresion, cargo.documentoId) }}
            </span>
          </td>
          <td :class="celda">{{ formatearFecha(cargo.fechaEmision) }}</td>
          <td :class="celdaNumerica">{{ formatearMonto(cargo.total) }}</td>
          <td :class="celdaNumerica">{{ formatearMonto(cargo.retenciones) }}</td>
          <td :class="celdaNumerica">{{ formatearMonto(cargo.rebajado) }}</td>
          <td :class="celdaNumerica">{{ formatearMonto(cargo.pagado) }}</td>
          <td :class="celdaNumerica">{{ formatearMonto(cargo.comprometido) }}</td>
          <td :class="celdaNumerica">{{ formatearMonto(cargo.saldo) }}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="font-bold">
          <th scope="row" colspan="2" :class="`${celda} text-left`">Totales</th>
          <td :class="celdaNumerica">{{ formatearMonto(impresion.totales.total) }}</td>
          <td :class="celdaNumerica">{{ formatearMonto(impresion.totales.retenciones) }}</td>
          <td :class="celdaNumerica">{{ formatearMonto(impresion.totales.rebajado) }}</td>
          <td :class="celdaNumerica">{{ formatearMonto(impresion.totales.pagado) }}</td>
          <td :class="celdaNumerica">{{ formatearMonto(impresion.totales.comprometido) }}</td>
          <td :class="celdaNumerica">{{ formatearMonto(impresion.totales.saldo) }}</td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>
