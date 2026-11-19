<script setup lang="ts">
import { RouterLink } from 'vue-router';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { textoDeMes } from '../../composables/reportes/ajustes-del-mes';
import type { MesDeBancarizacion } from '../../servicios/tipos-de-reportes-de-efectivo';
import CargosDeBancarizacion from './CargosDeBancarizacion.vue';
import EnlaceDeProveedorDelReporte from './EnlaceDeProveedorDelReporte.vue';

/** Un mes de un proveedor cuya suma llega al umbral, con sus pagos en efectivo y lo que cada uno pone en riesgo. */
defineProps<{ mes: MesDeBancarizacion }>();
</script>

<template>
  <TarjetaBase class="print:break-inside-avoid">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="font-semibold"><EnlaceDeProveedorDelReporte :id="mes.proveedorId" :nombre="mes.proveedorNombre" /></p>
        <p class="text-sm text-tierra-600 dark:text-tierra-300">{{ textoDeMes(mes.mes) }}</p>
      </div>
      <dl class="grid grid-cols-2 gap-x-4 text-right text-sm tabular-nums sm:grid-cols-4">
        <div>
          <dt class="text-xs text-tierra-500 dark:text-tierra-300">Suma del mes</dt>
          <dd>{{ formatearMonto(mes.sumaDelMes) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-tierra-500 dark:text-tierra-300">En efectivo</dt>
          <dd class="font-semibold">{{ formatearMonto(mes.efectivo) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-tierra-500 dark:text-tierra-300">IVA en riesgo</dt>
          <dd>{{ formatearMonto(mes.ivaEnRiesgo) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-tierra-500 dark:text-tierra-300">Costo no deducible</dt>
          <dd>{{ formatearMonto(mes.costoNoDeducible) }}</dd>
        </div>
      </dl>
    </div>
    <ul class="mt-3 space-y-3">
      <li v-for="pago in mes.pagos" :key="pago.pagoId" class="border-t border-tierra-100 pt-2 dark:border-tierra-700">
        <p class="flex flex-wrap items-center gap-x-2 text-sm">
          <RouterLink
            :to="{ name: 'cuentas-por-pagar.pagos.ficha', params: { id: pago.pagoId } }"
            class="rounded font-medium text-campo-700 hover:underline focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none dark:text-campo-300 print:text-current print:no-underline"
          >
            Recibo {{ pago.recibo }}
          </RouterLink>
          <span>{{ formatearFecha(pago.fecha) }}</span>
          <span v-if="pago.retiro">Retiro N.º {{ pago.retiro }}</span>
          <span class="font-semibold tabular-nums">{{ formatearMonto(pago.monto) }}</span>
          <InsigniaBase v-if="pago.sinBancarizar" tono="trigo">Con la excepción</InsigniaBase>
        </p>
        <p v-if="pago.motivoSinBancarizar" class="text-xs text-tierra-600 dark:text-tierra-300">
          Motivo: {{ pago.motivoSinBancarizar }}
        </p>
        <CargosDeBancarizacion :cargos="pago.cargos" />
      </li>
    </ul>
  </TarjetaBase>
</template>
