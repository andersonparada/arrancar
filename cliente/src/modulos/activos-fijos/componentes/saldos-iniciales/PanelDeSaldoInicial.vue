<script setup lang="ts">
import { RouterLink } from 'vue-router';
import DatosDelRegistro from '@/modulos/core/componentes/DatosDelRegistro.vue';
import { detallesDeSaldoEnFicha } from '../../composables/saldos-iniciales/detalles-de-saldo';
import type { SaldoInicial } from '../../servicios/saldos-iniciales.api';

/** Lo que se cargó como saldo inicial de este activo (sección de la ficha de los activos de saldo inicial). */
defineProps<{ saldo: SaldoInicial }>();
</script>

<template>
  <section aria-labelledby="titulo-del-saldo" class="space-y-2">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h2 id="titulo-del-saldo" class="text-sm font-semibold text-tierra-600 dark:text-tierra-300">Saldo inicial</h2>
      <RouterLink
        v-permiso="'activos-fijos.saldos-iniciales.ver'"
        :to="{ name: 'activos-fijos.saldos-iniciales' }"
        class="text-sm text-campo-800 underline dark:text-campo-300"
      >
        Ir a Saldos iniciales
      </RouterLink>
    </div>
    <DatosDelRegistro :detalles="detallesDeSaldoEnFicha(saldo)" />
  </section>
</template>
