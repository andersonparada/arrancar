<script setup lang="ts">
import { computed } from 'vue';
import { formatearFecha, formatearMonto, formatearNit } from '@/modulos/core/utilidades/formato';
import { lineasDeEmpresa, pieDeImpresion } from '../composables/contrasenas/impresion-de-contrasena';
import type { HojaDeImpresion, ImpresionDeContrasena } from '../servicios/tipos-de-contrasenas';
import TablaDeCargosImpresos from './TablaDeCargosImpresos.vue';

/**
 * Una hoja carta de la impresión. Siempre blanca con letra negra (también en modo oscuro) y con bordes y rótulos que se
 * entienden en blanco y negro: «ANULADA» y «REIMPRESIÓN» son texto, no color.
 */
const props = defineProps<{ impresion: ImpresionDeContrasena; hoja: HojaDeImpresion }>();
const empresa = computed(() => lineasDeEmpresa(props.impresion.empresa));
const linea = 'mt-6 border-t border-black pt-1 text-xs';
</script>

<template>
  <article
    class="hoja mx-auto w-full max-w-[8.5in] space-y-4 bg-white p-4 text-black ring-1 ring-tierra-300 sm:p-8 print:max-w-none print:p-0 print:ring-0"
    :aria-label="hoja.rotulo"
  >
    <header class="flex flex-wrap items-start justify-between gap-2 border-b-2 border-black pb-2">
      <div>
        <p class="text-lg font-bold">{{ empresa.principal }}</p>
        <p v-if="empresa.comercial" class="text-sm">{{ empresa.comercial }}</p>
        <p v-if="impresion.empresa.nit" class="text-sm">NIT {{ formatearNit(impresion.empresa.nit) }}</p>
      </div>
      <div class="text-right">
        <p class="border-2 border-black px-3 py-1 text-sm font-bold tracking-wide">{{ hoja.rotulo }}</p>
        <p v-if="impresion.reimpresion" class="mt-1 text-sm font-bold">REIMPRESIÓN</p>
      </div>
    </header>

    <p
      v-if="impresion.anulacion"
      class="border-4 border-double border-black p-2 text-center text-xl font-bold"
      role="alert"
    >
      ANULADA — {{ impresion.anulacion.motivo }}
    </p>

    <h2 class="text-xl font-bold">Contraseña de pago No. {{ impresion.contrasena.numero }}</h2>

    <dl class="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
      <div>
        <dt class="inline font-semibold">Proveedor:</dt>
        <dd class="ml-1 inline">{{ impresion.proveedor.nombre }}</dd>
      </div>
      <div v-if="impresion.proveedor.nit">
        <dt class="inline font-semibold">NIT:</dt>
        <dd class="ml-1 inline">{{ formatearNit(impresion.proveedor.nit) }}</dd>
      </div>
      <div>
        <dt class="inline font-semibold">Fecha de recepción:</dt>
        <dd class="ml-1 inline">{{ formatearFecha(impresion.contrasena.fecha) }}</dd>
      </div>
      <div>
        <dt class="inline font-semibold">Pago prometido para el:</dt>
        <dd class="ml-1 inline font-bold">{{ formatearFecha(impresion.contrasena.fechaDePago) }}</dd>
      </div>
      <div v-if="impresion.contrasena.observaciones" class="sm:col-span-2">
        <dt class="inline font-semibold">Observaciones:</dt>
        <dd class="ml-1 inline">{{ impresion.contrasena.observaciones }}</dd>
      </div>
    </dl>

    <TablaDeCargosImpresos :impresion="impresion" />

    <ul v-if="impresion.compensaciones.length > 0" class="space-y-1 text-sm font-semibold">
      <li v-for="compensacion in impresion.compensaciones" :key="compensacion.documentoId">
        {{ compensacion.texto }}, emitida el {{ formatearFecha(compensacion.fechaEmision) }}: −
        {{ formatearMonto(compensacion.monto) }}
      </li>
    </ul>

    <p class="text-lg font-bold">Saldo por pagar {{ formatearMonto(impresion.totales.saldo) }}</p>
    <p v-if="impresion.leyendaDeRetenciones" class="text-sm">{{ impresion.leyendaDeRetenciones }}</p>
    <p v-if="impresion.leyenda" class="text-sm">{{ impresion.leyenda }}</p>

    <div class="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
      <div>
        <p :class="linea">Entregado por (empresa): nombre, firma y fecha</p>
      </div>
      <div v-if="hoja.firmaElProveedor">
        <p :class="linea">Recibido por (proveedor): nombre, firma y fecha</p>
      </div>
    </div>

    <footer class="flex flex-wrap justify-between gap-x-4 text-xs">
      <span>{{ pieDeImpresion(impresion) }}</span>
      <span v-if="impresion.reimpresion" class="font-bold">REIMPRESIÓN</span>
    </footer>
  </article>
</template>
