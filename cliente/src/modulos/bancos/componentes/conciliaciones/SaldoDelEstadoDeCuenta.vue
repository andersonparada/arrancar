<script setup lang="ts">
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';

/** El saldo calculado, destacado, con el texto que explica qué hacer si no coincide con el papel. */
defineProps<{ saldo: string }>();
</script>

<template>
  <TarjetaBase class="space-y-2 bg-campo-50 dark:bg-campo-950/40">
    <p class="text-sm text-tierra-600 dark:text-tierra-300">Saldo que debe mostrar su estado de cuenta</p>
    <p class="text-3xl font-bold text-campo-800 dark:text-campo-300">{{ formatearMonto(saldo) }}</p>
    <p class="text-sm text-tierra-600 dark:text-tierra-300">
      Compárelo con su estado de cuenta. Si no coincide, registre la comisión, interés o cargo que falte como nota con
      fecha de este mes.
    </p>
  </TarjetaBase>
</template>
