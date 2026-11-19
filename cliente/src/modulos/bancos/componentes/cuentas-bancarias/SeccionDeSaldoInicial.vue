<script setup lang="ts">
import { RouterLink } from 'vue-router';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { usarResumenDeSaldoInicial } from '../../composables/cuentas-bancarias/usar-resumen-de-saldo-inicial';
import { CUENTA_SIN_SALDO } from '../../textos-de-apertura';

/**
 * El saldo inicial de la cuenta en su ficha: un resumen de solo lectura con el enlace a la pantalla «Saldos
 * iniciales», donde se registra, se corrige y se cargan las partidas de apertura.
 */
const props = defineProps<{ cuentaBancariaId: string }>();
const { datos: saldo, cargando } = usarResumenDeSaldoInicial(props.cuentaBancariaId);
</script>

<template>
  <div v-if="cargando || saldo" class="space-y-3">
    <h2 class="text-sm font-semibold text-tierra-700 dark:text-tierra-200">Saldo inicial</h2>
    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <TarjetaBase v-else-if="saldo" class="flex flex-wrap items-center justify-between gap-3">
      <p v-if="saldo.forma === 'sin_saldo'" class="min-w-0 text-sm text-tierra-600 dark:text-tierra-300">
        {{ CUENTA_SIN_SALDO }}
      </p>
      <dl v-else class="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        <div>
          <dt class="text-xs text-tierra-500">Fecha de corte</dt>
          <dd>{{ formatearFecha(saldo.fechaDeCorte) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-tierra-500">Saldo en libros al corte</dt>
          <dd class="font-medium tabular-nums">{{ formatearMonto(saldo.saldoEnLibrosAlCorte) }}</dd>
        </div>
      </dl>
      <RouterLink
        :to="{ name: 'bancos.saldos-iniciales.ficha', params: { cuentaBancariaId } }"
        class="text-sm font-medium text-campo-700 hover:underline dark:text-campo-400"
      >
        {{ saldo.forma === 'sin_saldo' ? 'Cargar saldo inicial' : 'Ver y corregir en Saldos iniciales' }}
      </RouterLink>
    </TarjetaBase>
  </div>
</template>
