<script setup lang="ts">
import type { Component } from 'vue';
import { RouterLink, type RouteLocationRaw } from 'vue-router';

/** Un enlace a otra pantalla con la misma cara de un botón (navegar es un enlace, no un botón: se abre en otra pestaña). */
withDefaults(
  defineProps<{
    to: RouteLocationRaw;
    variante?: 'primario' | 'secundario';
    icono?: Component | null;
    pequeno?: boolean;
  }>(),
  { variante: 'secundario', icono: null },
);

const estilos = {
  primario: 'bg-campo-700 text-white hover:bg-campo-800 dark:bg-campo-600 dark:hover:bg-campo-500',
  secundario:
    'bg-white text-tierra-800 ring-1 ring-tierra-200 hover:bg-tierra-100 dark:bg-tierra-800 dark:text-tierra-100 dark:ring-tierra-700 dark:hover:bg-tierra-700',
};
</script>

<template>
  <RouterLink
    :to="to"
    class="inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors"
    :class="[estilos[variante], pequeno ? 'px-2.5 py-1.5 text-sm' : 'px-4 py-2.5 text-sm']"
  >
    <component :is="icono" v-if="icono" class="size-4" aria-hidden="true" />
    <slot />
  </RouterLink>
</template>
