<script setup lang="ts">
import type { Component } from 'vue';
import { RouterLink } from 'vue-router';

defineProps<{ ruta: string; titulo: string; icono: Component }>();

const CLASE_ACTIVA =
  'bg-marca-texto/15 text-marca-texto! before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-r-full before:bg-acento';
</script>

<template>
  <!-- "Inicio" (`/`) solo se marca en su propia página; las demás, también en sus subpáginas. -->
  <RouterLink
    :to="ruta"
    class="relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-marca-texto/85 hover:bg-marca-texto/10"
    :active-class="ruta === '/' ? '' : CLASE_ACTIVA"
    :exact-active-class="CLASE_ACTIVA"
  >
    <component :is="icono" class="size-[18px] shrink-0 opacity-90" aria-hidden="true" />
    {{ titulo }}
  </RouterLink>
</template>
