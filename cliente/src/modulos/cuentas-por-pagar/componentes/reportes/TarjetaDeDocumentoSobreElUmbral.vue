<script setup lang="ts">
import { RouterLink } from 'vue-router';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { notaDelCargo } from '../../composables/reportes/bancarizacion';
import { TEXTOS_DE_FORMA } from '../../composables/reportes/pagos-realizados';
import type { DocumentoSobreElUmbral } from '../../servicios/tipos-de-reportes-de-efectivo';
import EnlaceDeProveedorDelReporte from './EnlaceDeProveedorDelReporte.vue';

/** Un documento del umbral o más pagado en parte en efectivo, con todos sus pagos (forma, fecha y monto). */
defineProps<{ documento: DocumentoSobreElUmbral }>();
</script>

<template>
  <TarjetaBase class="print:break-inside-avoid">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div class="min-w-0">
        <RouterLink
          :to="{ name: 'cuentas-por-pagar.documentos.ficha', params: { documentoId: documento.documentoId } }"
          class="rounded font-semibold text-campo-700 hover:underline focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none dark:text-campo-300 print:text-current print:no-underline"
        >
          {{ documento.documento }}
        </RouterLink>
        <p class="text-sm">
          <EnlaceDeProveedorDelReporte :id="documento.proveedorId" :nombre="documento.proveedorNombre" />
        </p>
        <p class="mt-1 flex flex-wrap gap-1">
          <InsigniaBase v-for="marca in documento.marcas" :key="marca" tono="rojo">{{ marca }}</InsigniaBase>
        </p>
      </div>
      <dl class="grid grid-cols-2 gap-x-4 text-right text-sm tabular-nums sm:grid-cols-4">
        <div>
          <dt class="text-xs text-tierra-500 dark:text-tierra-300">Total</dt>
          <dd>{{ formatearMonto(documento.total) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-tierra-500 dark:text-tierra-300">En efectivo</dt>
          <dd class="font-semibold">{{ formatearMonto(documento.efectivo) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-tierra-500 dark:text-tierra-300">IVA en riesgo</dt>
          <dd>{{ formatearMonto(documento.ivaEnRiesgo) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-tierra-500 dark:text-tierra-300">Costo no deducible</dt>
          <dd>{{ formatearMonto(documento.costoNoDeducible) }}</dd>
        </div>
      </dl>
    </div>
    <p v-if="notaDelCargo(documento)" class="mt-1 text-xs text-tierra-600 dark:text-tierra-300">
      {{ notaDelCargo(documento) }}
    </p>
    <ul class="mt-3 space-y-1 border-t border-tierra-100 pt-2 text-sm dark:border-tierra-700">
      <li v-for="pago in documento.pagos" :key="pago.pagoId" class="flex flex-wrap items-center gap-x-2">
        <RouterLink
          :to="{ name: 'cuentas-por-pagar.pagos.ficha', params: { id: pago.pagoId } }"
          class="rounded font-medium text-campo-700 hover:underline focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none dark:text-campo-300 print:text-current print:no-underline"
        >
          Pago {{ pago.numero }}
        </RouterLink>
        <InsigniaBase :tono="pago.forma === 'efectivo' ? 'trigo' : 'tierra'">{{
          TEXTOS_DE_FORMA[pago.forma]
        }}</InsigniaBase>
        <span>{{ formatearFecha(pago.fecha) }}</span>
        <span class="font-semibold tabular-nums">{{ formatearMonto(pago.monto) }}</span>
      </li>
    </ul>
  </TarjetaBase>
</template>
