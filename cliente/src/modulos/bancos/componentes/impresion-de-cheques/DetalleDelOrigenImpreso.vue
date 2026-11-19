<script setup lang="ts">
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { DetalleDelOrigen } from '../../servicios/tipos-de-impresion-de-cheques';

/**
 * Lo que dice el módulo de origen del pago (Cuentas por pagar): cada documento pagado con sus retenciones y el total
 * retenido. Va en el comprobante de egreso, siempre en blanco y negro.
 */
defineProps<{ origen: DetalleDelOrigen }>();
const IMPUESTOS = { iva: 'IVA', isr: 'ISR' } as const;
const celda = 'border border-black px-1.5 py-0.5';
</script>

<template>
  <section class="space-y-1" aria-label="Detalle del origen">
    <p class="font-semibold">{{ origen.descripcion }}</p>
    <table v-if="origen.documentos.length" class="w-full border-collapse text-left">
      <thead>
        <tr>
          <th :class="celda" scope="col">Documento</th>
          <th :class="[celda, 'text-right']" scope="col">Pagado</th>
          <th :class="celda" scope="col">Retenciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="documento in origen.documentos" :key="`${documento.tipo}-${documento.serie}-${documento.numero}`">
          <td :class="celda">{{ documento.tipo }} {{ documento.serie ?? '' }} {{ documento.numero }}</td>
          <td :class="[celda, 'text-right']">{{ formatearMonto(documento.monto) }}</td>
          <td :class="celda">
            <span v-if="!documento.retenciones.length">—</span>
            <span v-for="retencion in documento.retenciones" :key="retencion.impuesto" class="block">
              {{ IMPUESTOS[retencion.impuesto] }} {{ formatearMonto(retencion.monto) }}
              <template v-if="retencion.constanciaNumero"> (constancia {{ retencion.constanciaNumero }})</template>
            </span>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="origen.totalRetenido !== null" class="text-right font-semibold">
      Total retenido: {{ formatearMonto(origen.totalRetenido) }}
    </p>
  </section>
</template>
