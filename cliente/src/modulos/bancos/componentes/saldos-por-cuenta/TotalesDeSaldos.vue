<script setup lang="ts">
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { TotalDeSaldos } from '../../servicios/saldos-por-cuenta.api';

/** Los dos lados, sin compensar: Bancos (saldo a favor) y Sobregiros bancarios (saldo en contra, en valor absoluto). */
defineProps<{ bancos: TotalDeSaldos; sobregiros: TotalDeSaldos; nota: string }>();
</script>

<template>
  <section aria-label="Totales sin compensar" class="space-y-3 break-inside-avoid">
    <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
      <TarjetaBase v-for="(total, titulo) in { Bancos: bancos, 'Sobregiros bancarios': sobregiros }" :key="titulo">
        <h3 class="font-semibold">Total {{ titulo }}</h3>
        <p class="text-xs text-tierra-500">{{ total.cantidadDeCuentas }} cuenta(s)</p>
        <dl class="mt-2 space-y-1 text-sm">
          <div class="flex justify-between gap-3">
            <dt>Saldo en libros</dt>
            <dd class="tabular-nums">{{ formatearMonto(total.saldoEnLibros) }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt>Cheques posfechados</dt>
            <dd class="tabular-nums">{{ formatearMonto(total.chequesPosfechados) }}</dd>
          </div>
          <div class="flex justify-between gap-3 font-semibold">
            <dt>Disponible</dt>
            <dd class="tabular-nums">{{ formatearMonto(total.disponible) }}</dd>
          </div>
        </dl>
      </TarjetaBase>
    </div>
    <p v-if="nota" class="text-xs text-tierra-600 dark:text-tierra-300">{{ nota }}</p>
  </section>
</template>
