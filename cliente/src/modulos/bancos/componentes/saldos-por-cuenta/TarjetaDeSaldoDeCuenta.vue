<script setup lang="ts">
import { computed } from 'vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import {
  detalleDeCuenta,
  estadoDeConciliacion,
  TEXTO_FONDOS_INSUFICIENTES,
} from '../../composables/saldos-por-cuenta/textos-de-saldos';
import type { SaldoDeCuenta, TotalEnTransito } from '../../servicios/saldos-por-cuenta.api';
import PartidasEnTransito from './PartidasEnTransito.vue';

/** Una cuenta con su saldo en libros, lo comprometido, lo disponible y lo que el banco aún no ve. */
const props = defineProps<{ cuenta: SaldoDeCuenta }>();

const conciliacion = computed(() => estadoDeConciliacion(props.cuenta));
const transito = computed<{ etiqueta: string; total: TotalEnTransito }[]>(() => [
  { etiqueta: 'Cheques en circulación', total: props.cuenta.chequesEnCirculacion },
  { etiqueta: 'Depósitos en tránsito', total: props.cuenta.depositosEnTransito },
  { etiqueta: 'Débitos en tránsito', total: props.cuenta.debitosEnTransito },
  { etiqueta: 'Errores del banco (neto)', total: props.cuenta.erroresDelBanco },
]);
const CLASE_DE_AVISO = 'rounded-full px-2 py-0.5 text-xs font-medium';
</script>

<template>
  <TarjetaBase class="break-inside-avoid print:shadow-none">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div class="min-w-0">
        <h3 class="font-semibold break-words">{{ cuenta.cuentaBancariaNombre }}</h3>
        <p class="text-xs break-words text-tierra-500">{{ detalleDeCuenta(cuenta) }}</p>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <span v-if="!cuenta.activo" :class="[CLASE_DE_AVISO, 'bg-tierra-100 text-tierra-600 dark:bg-tierra-700']">
          Inactiva
        </span>
        <span
          v-if="cuenta.fondosInsuficientes"
          role="status"
          :class="[CLASE_DE_AVISO, 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200']"
        >
          {{ TEXTO_FONDOS_INSUFICIENTES }}
        </span>
        <span
          :class="[
            CLASE_DE_AVISO,
            conciliacion.atrasada
              ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'
              : 'bg-tierra-100 text-tierra-700 dark:bg-tierra-700 dark:text-tierra-200',
          ]"
        >
          {{ conciliacion.texto }}{{ conciliacion.atrasada ? ' — atrasada' : '' }}
        </span>
      </div>
    </div>

    <dl class="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
      <div>
        <dt class="text-xs text-tierra-500">Saldo en libros</dt>
        <dd class="text-lg font-semibold tabular-nums">{{ formatearMonto(cuenta.saldoEnLibros) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-tierra-500">Cheques posfechados</dt>
        <dd class="text-lg tabular-nums">{{ formatearMonto(cuenta.chequesPosfechados) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-tierra-500">Disponible después de posfechados</dt>
        <dd
          class="text-lg font-semibold tabular-nums"
          :class="cuenta.fondosInsuficientes ? 'text-red-700 dark:text-red-300' : ''"
        >
          {{ formatearMonto(cuenta.disponible) }}
        </dd>
      </div>
    </dl>

    <dl
      class="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 border-t border-tierra-100 pt-3 text-sm sm:grid-cols-2 dark:border-tierra-700"
    >
      <div v-for="linea in transito" :key="linea.etiqueta" class="flex justify-between gap-3">
        <dt class="text-tierra-600 dark:text-tierra-300">
          {{ linea.etiqueta
          }}<span v-if="linea.total.cantidad" class="text-xs text-tierra-500"> ({{ linea.total.cantidad }})</span>
        </dt>
        <dd class="tabular-nums">{{ formatearMonto(linea.total.monto) }}</dd>
      </div>
      <div class="flex justify-between gap-3 font-medium sm:col-span-2">
        <dt>Saldo que debería mostrar el banco</dt>
        <dd class="tabular-nums">{{ formatearMonto(cuenta.saldoSegunBanco) }}</dd>
      </div>
    </dl>
    <PartidasEnTransito :partidas="cuenta.partidas" />
  </TarjetaBase>
</template>
