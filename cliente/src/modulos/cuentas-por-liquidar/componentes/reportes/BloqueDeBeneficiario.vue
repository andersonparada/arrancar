<script setup lang="ts">
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { textoDeClaseDeAnticipo, textoDeVencimiento } from '../../composables/reportes/anticipos-por-liquidar';
import type { BeneficiarioPorLiquidar } from '../../servicios/tipos-de-reportes';

/** Los anticipos por liquidar de un beneficiario: en el celular una tarjeta, en pantalla ancha y en papel una tabla. */
defineProps<{ beneficiario: BeneficiarioPorLiquidar }>();
</script>

<template>
  <TarjetaBase class="print:break-inside-avoid print:shadow-none">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div class="min-w-0">
        <h2 class="truncate font-semibold">{{ beneficiario.beneficiario }}</h2>
        <p class="text-sm text-tierra-600 dark:text-tierra-300">
          {{ beneficiario.esEmpleado ? 'Empleado' : 'No es empleado' }} · {{ beneficiario.cantidad }}
          {{ beneficiario.cantidad === 1 ? 'anticipo' : 'anticipos' }}
          <InsigniaBase v-if="beneficiario.vencidos > 0" tono="rojo" class="ml-1">
            {{ beneficiario.vencidos }} {{ beneficiario.vencidos === 1 ? 'vencido' : 'vencidos' }}
          </InsigniaBase>
        </p>
      </div>
      <p class="text-right">
        <span class="block text-lg font-semibold tabular-nums">{{ formatearMonto(beneficiario.porJustificar) }}</span>
        <span class="block text-xs text-tierra-500 dark:text-tierra-300">por justificar</span>
        <span v-if="Number(beneficiario.aReembolsar) > 0" class="block text-xs text-tierra-600 dark:text-tierra-300">
          y {{ formatearMonto(beneficiario.aReembolsar) }} a reembolsarle
        </span>
      </p>
    </div>
    <ul class="mt-3 divide-y divide-tierra-100 text-sm dark:divide-tierra-700">
      <li
        v-for="anticipo in beneficiario.anticipos"
        :key="anticipo.id"
        class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2"
      >
        <span class="font-medium">N.º {{ anticipo.numero }} · {{ textoDeClaseDeAnticipo(anticipo.clase) }}</span>
        <span class="text-tierra-600 dark:text-tierra-300">
          Entregado el {{ formatearFecha(anticipo.fecha) }} ({{ anticipo.diasDesdeLaEntrega }} días) · límite
          {{ formatearFecha(anticipo.fechaLimite) }}
        </span>
        <span :class="anticipo.vencido ? 'font-medium text-red-700 dark:text-red-300' : ''">
          {{ textoDeVencimiento(anticipo.diasVencido) }}
        </span>
        <span class="tabular-nums">
          de {{ formatearMonto(anticipo.monto) }} ·
          <strong v-if="Number(anticipo.aReembolsar) > 0">
            gastado de más: {{ formatearMonto(anticipo.aReembolsar) }} a reembolsar
          </strong>
          <strong v-else>{{ formatearMonto(anticipo.porJustificar) }}</strong>
        </span>
      </li>
    </ul>
  </TarjetaBase>
</template>
