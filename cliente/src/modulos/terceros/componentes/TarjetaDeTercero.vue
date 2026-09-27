<script setup lang="ts">
import type { Component } from 'vue';
import { RouterLink, type RouteLocationRaw } from 'vue-router';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { formatearTelefono } from '@/modulos/core/utilidades/formato';
import type { TerceroEnListado } from '../servicios/terceros.api';

/** `detalle` es lo propio de la pantalla: la clase del cliente o la categoría del proveedor. */
defineProps<{ tercero: TerceroEnListado; detalle: string; icono: Component; destino: RouteLocationRaw }>();
</script>

<template>
  <RouterLink
    :to="destino"
    class="flex h-full flex-col gap-2 rounded-2xl bg-white p-4 ring-1 ring-tierra-200/70 transition hover:ring-campo-400 dark:bg-tierra-800/60 dark:ring-tierra-700"
  >
    <div class="flex items-start gap-3">
      <span
        class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-campo-100 text-campo-800 dark:bg-campo-900 dark:text-campo-200"
      >
        <component :is="icono" class="size-5" aria-hidden="true" />
      </span>
      <div class="min-w-0 flex-1">
        <p class="truncate font-semibold">{{ tercero.nombreMostrar }}</p>
        <p class="truncate text-sm text-tierra-500">{{ detalle }}</p>
      </div>
      <InsigniaBase v-if="!tercero.activo" tono="rojo">Inactivo</InsigniaBase>
    </div>
    <p class="truncate text-sm text-tierra-600 dark:text-tierra-300">
      {{ [tercero.nit, formatearTelefono(tercero.telefono)].filter(Boolean).join(' · ') || 'Sin NIT ni teléfono' }}
    </p>
    <div class="flex flex-wrap gap-1.5">
      <InsigniaBase v-if="tercero.papeles.cliente" tono="campo">Cliente</InsigniaBase>
      <InsigniaBase v-if="tercero.papeles.proveedor" tono="trigo">Proveedor</InsigniaBase>
    </div>
  </RouterLink>
</template>
