<script setup lang="ts">
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { esNegativo } from '../../composables/flujo-de-efectivo/textos-del-flujo';

/** Un monto del flujo: lo que resta se ve en rojo (y con su signo, para quien no distingue colores). */
defineProps<{ monto: string }>();
</script>

<template>
  <span class="whitespace-nowrap" :class="esNegativo(monto) ? 'text-red-600 dark:text-red-400' : ''">{{
    formatearMonto(monto)
  }}</span>
</template>
