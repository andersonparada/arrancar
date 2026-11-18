<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import type { ResumenDeSaldoInicial } from '../../servicios/tipos-de-saldos-iniciales';
import { CUENTA_SIN_SALDO } from '../../textos-de-apertura';
import CuadreDeLaCuenta from './CuadreDeLaCuenta.vue';

/** La tarjeta de una cuenta en la lista: su cuadre al corte; toda ella lleva a la ficha donde se cargan las partidas. */
defineProps<{ cuenta: ResumenDeSaldoInicial }>();
</script>

<template>
  <RouterLink
    :to="{ name: 'bancos.saldos-iniciales.ficha', params: { cuentaBancariaId: cuenta.cuentaBancariaId } }"
    class="block h-full rounded-2xl transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none"
  >
    <TarjetaBase class="flex h-full flex-col gap-3">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <p class="font-semibold break-words">{{ cuenta.cuentaNombre }}</p>
          <p v-if="cuenta.bancoNombre" class="text-xs text-tierra-500">{{ cuenta.bancoNombre }}</p>
        </div>
        <ChevronRight class="size-4 shrink-0 text-tierra-400" aria-hidden="true" />
      </div>
      <p v-if="cuenta.forma === 'sin_saldo'" class="text-sm text-tierra-600 dark:text-tierra-300">
        {{ CUENTA_SIN_SALDO }}
      </p>
      <CuadreDeLaCuenta v-else :cuenta="cuenta" />
    </TarjetaBase>
  </RouterLink>
</template>
