<script setup lang="ts">
import { computed } from 'vue';
import { formatearFecha, formatearMonto, formatearNit } from '@/modulos/core/utilidades/formato';
import { leyendaDePosfechado, lineasDeLaEmpresa, textoDelMedio } from '../composables/pagos/comprobante-de-pago';
import type { ComprobanteDePago } from '../servicios/tipos-de-pagos';
import TablaDelComprobante from './TablaDelComprobante.vue';

/**
 * Una hoja carta del comprobante. Siempre blanca con letra negra (también en modo oscuro); «ANULADO» es texto, no color.
 * No es un documento tributario: las leyendas son las que manda el servidor.
 */
const props = defineProps<{ comprobante: ComprobanteDePago; rotulo: string }>();
const empresa = computed(() => lineasDeLaEmpresa(props.comprobante.empresa));
const linea = 'mt-8 border-t border-black pt-1 text-xs';
</script>

<template>
  <article
    class="hoja mx-auto w-full max-w-[8.5in] space-y-4 bg-white p-4 text-black ring-1 ring-tierra-300 sm:p-8 print:max-w-none print:p-0 print:ring-0"
    :aria-label="rotulo"
  >
    <header class="flex flex-wrap items-start justify-between gap-2 border-b-2 border-black pb-2">
      <div>
        <p class="text-lg font-bold">{{ empresa.principal }}</p>
        <p v-if="empresa.comercial" class="text-sm">{{ empresa.comercial }}</p>
        <p v-if="comprobante.empresa.nit" class="text-sm">NIT {{ formatearNit(comprobante.empresa.nit) }}</p>
      </div>
      <p class="border-2 border-black px-3 py-1 text-sm font-bold tracking-wide">{{ rotulo }}</p>
    </header>

    <p
      v-if="comprobante.pago.anulacion"
      class="border-4 border-double border-black p-2 text-center text-xl font-bold"
      role="alert"
    >
      ANULADO — {{ comprobante.pago.anulacion.motivo }}
    </p>

    <h2 class="text-xl font-bold">{{ comprobante.titulo }} No. {{ comprobante.pago.numero }}</h2>

    <dl class="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
      <div>
        <dt class="inline font-semibold">Proveedor:</dt>
        <dd class="ml-1 inline">{{ comprobante.proveedor.nombre }}</dd>
      </div>
      <div v-if="comprobante.proveedor.nit">
        <dt class="inline font-semibold">NIT:</dt>
        <dd class="ml-1 inline">{{ formatearNit(comprobante.proveedor.nit) }}</dd>
      </div>
      <div>
        <dt class="inline font-semibold">A nombre de:</dt>
        <dd class="ml-1 inline">{{ comprobante.beneficiario }}</dd>
      </div>
      <div>
        <dt class="inline font-semibold">Fecha:</dt>
        <dd class="ml-1 inline">{{ formatearFecha(comprobante.pago.fecha) }}</dd>
      </div>
      <div v-if="comprobante.medio" class="sm:col-span-2">
        <dt class="inline font-semibold">Documento bancario:</dt>
        <dd class="ml-1 inline">{{ textoDelMedio(comprobante.medio) }}</dd>
      </div>
      <div v-if="comprobante.retiro" class="sm:col-span-2">
        <dt class="inline font-semibold">Retiro de efectivo:</dt>
        <dd class="ml-1 inline">{{ comprobante.retiro.numero }} · custodio {{ comprobante.retiro.custodio }}</dd>
      </div>
      <div v-if="comprobante.pago.referencia">
        <dt class="inline font-semibold">Referencia:</dt>
        <dd class="ml-1 inline">{{ comprobante.pago.referencia }}</dd>
      </div>
      <div v-if="comprobante.pago.motivo" class="sm:col-span-2">
        <dt class="inline font-semibold">Motivo:</dt>
        <dd class="ml-1 inline">{{ comprobante.pago.motivo }}</dd>
      </div>
      <div v-if="comprobante.pago.observaciones" class="sm:col-span-2">
        <dt class="inline font-semibold">Observaciones:</dt>
        <dd class="ml-1 inline">{{ comprobante.pago.observaciones }}</dd>
      </div>
    </dl>
    <p v-if="leyendaDePosfechado(comprobante.pago)" class="text-sm font-bold">
      {{ leyendaDePosfechado(comprobante.pago) }}
    </p>

    <TablaDelComprobante v-for="contrasena in comprobante.contrasenas" :key="contrasena.id" :contrasena="contrasena" />

    <div class="space-y-1">
      <p class="text-lg font-bold">Total pagado {{ formatearMonto(comprobante.totalPagado) }}</p>
      <p class="text-sm">{{ comprobante.totalEnLetras }}</p>
      <p class="text-sm">
        Retenciones {{ formatearMonto(comprobante.totalRetenciones) }} · total que cubre
        {{ formatearMonto(comprobante.totalCubierto) }}
      </p>
    </div>
    <p v-for="leyenda in comprobante.leyendas" :key="leyenda" class="text-sm">{{ leyenda }}</p>

    <div class="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
      <div>
        <p :class="linea">{{ comprobante.firmas.entrega.rotulo }}</p>
        <p v-if="comprobante.firmas.entrega.nombre" class="text-xs">{{ comprobante.firmas.entrega.nombre }}</p>
      </div>
      <div>
        <p :class="linea">{{ comprobante.firmas.recibe.rotulo }}</p>
        <p v-if="comprobante.firmas.recibe.nombre" class="text-xs">{{ comprobante.firmas.recibe.nombre }}</p>
      </div>
    </div>
  </article>
</template>
