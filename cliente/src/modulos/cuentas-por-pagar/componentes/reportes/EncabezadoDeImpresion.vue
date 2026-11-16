<script setup lang="ts">
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { formatearFechaHora, formatearTexto } from '@/modulos/core/utilidades/formato';

/** El encabezado que solo sale en papel: empresa, título, corte y filtros, y quién lo emitió y cuándo. */
defineProps<{ titulo: string; lineas: string[] }>();
const sesion = usarSesion();
const emitido = formatearFechaHora(new Date());
</script>

<template>
  <header class="hidden space-y-1 border-b border-tierra-400 pb-2 print:block">
    <p class="text-sm font-medium">{{ formatearTexto(sesion.empresa?.nombre) }}</p>
    <h1 class="text-lg font-semibold">{{ titulo }}</h1>
    <p v-for="linea in lineas" :key="linea" class="text-sm">{{ linea }}</p>
    <p class="text-xs">Emitido el {{ emitido }} por {{ formatearTexto(sesion.usuario?.nombre) }}</p>
  </header>
</template>
