<script setup lang="ts">
import { formatearFecha, formatearMonto, formatearNit } from '@/modulos/core/utilidades/formato';
import type { ComprobanteDeEgreso } from '../../servicios/tipos-de-impresion-de-cheques';
import DetalleDelOrigenImpreso from './DetalleDelOrigenImpreso.vue';

/**
 * El comprobante de egreso: es para el archivo de la empresa, no un documento tributario. Siempre negro sobre blanco
 * (también en modo oscuro); «REIMPRESIÓN», «NO NEGOCIABLE» y «PARA ABONO EN CUENTA» son texto, no color.
 */
const props = defineProps<{ comprobante: ComprobanteDeEgreso }>();
const celda = 'border border-black px-1.5 py-1';
const renglonesContables = Array.from({ length: props.comprobante.aplicacionContable.renglonesEnBlanco }, (_, i) => i);
</script>

<template>
  <article class="space-y-3 text-[9pt] leading-snug text-black" :aria-label="comprobante.titulo">
    <header class="flex flex-wrap items-start justify-between gap-2 border-b-2 border-black pb-2">
      <div>
        <p class="text-base font-bold">{{ comprobante.empresa.nombre }}</p>
        <p v-if="comprobante.empresa.nit">NIT {{ formatearNit(comprobante.empresa.nit) }}</p>
      </div>
      <div class="text-right">
        <p class="border-2 border-black px-2 py-1 font-bold tracking-wide">{{ comprobante.titulo }}</p>
        <p v-if="comprobante.esReimpresion" class="mt-1 font-bold">REIMPRESIÓN</p>
      </div>
    </header>

    <dl class="grid grid-cols-2 gap-x-4 gap-y-0.5">
      <div>
        <dt class="inline font-semibold">Cheque No.:</dt>
        <dd class="ml-1 inline">{{ comprobante.cheque.serie ?? '' }}{{ comprobante.cheque.numero }}</dd>
      </div>
      <div>
        <dt class="inline font-semibold">Fecha:</dt>
        <dd class="ml-1 inline">{{ formatearFecha(comprobante.cheque.fecha) }}</dd>
      </div>
      <div class="col-span-2">
        <dt class="inline font-semibold">Cuenta:</dt>
        <dd class="ml-1 inline">
          {{ comprobante.cuenta.nombre }}, {{ comprobante.cuenta.numero }} ({{ comprobante.cuenta.banco }})
        </dd>
      </div>
      <div class="col-span-2">
        <dt class="inline font-semibold">Beneficiario:</dt>
        <dd class="ml-1 inline">{{ comprobante.cheque.beneficiario }}</dd>
      </div>
      <div class="col-span-2">
        <dt class="inline font-semibold">Monto:</dt>
        <dd class="ml-1 inline font-bold">{{ formatearMonto(comprobante.cheque.monto) }}</dd>
        <dd class="ml-1 inline">({{ comprobante.cheque.montoEnLetras }})</dd>
      </div>
      <div class="col-span-2">
        <dt class="inline font-semibold">Concepto:</dt>
        <dd class="ml-1 inline">{{ comprobante.cheque.concepto }}</dd>
      </div>
      <div v-if="comprobante.cheque.referencia">
        <dt class="inline font-semibold">Referencia:</dt>
        <dd class="ml-1 inline">{{ comprobante.cheque.referencia }}</dd>
      </div>
      <div v-if="comprobante.cheque.observaciones" class="col-span-2">
        <dt class="inline font-semibold">Observaciones:</dt>
        <dd class="ml-1 inline">{{ comprobante.cheque.observaciones }}</dd>
      </div>
    </dl>
    <p v-if="comprobante.cheque.noNegociable || comprobante.cheque.paraAbonoEnCuenta" class="font-bold">
      <span v-if="comprobante.cheque.noNegociable">NO NEGOCIABLE</span>
      <span v-if="comprobante.cheque.noNegociable && comprobante.cheque.paraAbonoEnCuenta"> · </span>
      <span v-if="comprobante.cheque.paraAbonoEnCuenta">PARA ABONO EN CUENTA</span>
    </p>

    <DetalleDelOrigenImpreso v-if="comprobante.origen" :origen="comprobante.origen" />

    <section v-if="renglonesContables.length" aria-label="Aplicación contable">
      <p class="font-semibold">Aplicación contable (se llena a mano)</p>
      <table class="w-full border-collapse text-left">
        <thead>
          <tr>
            <th :class="celda" scope="col">Cuenta contable</th>
            <th :class="[celda, 'w-28']" scope="col">Debe</th>
            <th :class="[celda, 'w-28']" scope="col">Haber</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="renglon in renglonesContables" :key="renglon">
            <td :class="[celda, 'h-5']" />
            <td :class="celda" />
            <td :class="celda" />
          </tr>
        </tbody>
      </table>
    </section>

    <ul class="grid grid-cols-2 gap-x-6 gap-y-5 pt-4 sm:grid-cols-3">
      <li v-for="firma in comprobante.firmas" :key="firma.rotulo" class="border-t border-black pt-1">
        <span class="font-semibold">{{ firma.rotulo }}</span>
        <span v-if="firma.nombre" class="block">{{ firma.nombre }}</span>
        <span v-if="firma.conDpiYFecha" class="block">DPI: ____________________ Fecha: ____________</span>
      </li>
    </ul>
    <p class="text-[7.5pt]">{{ comprobante.leyenda }}</p>
  </article>
</template>
