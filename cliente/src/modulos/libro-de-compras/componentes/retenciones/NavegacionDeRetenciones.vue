<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { PESTANAS_DE_RETENCIONES as textos } from '../../textos-de-retenciones';

/** Las tres secciones de Retenciones como pestañas; la de «Por resolver» muestra cuántas hay pendientes. */
defineProps<{ pendientes: number | null }>();

const secciones = [
  { nombre: 'libro-de-compras.retenciones', texto: textos.mes },
  { nombre: 'libro-de-compras.retenciones.por-resolver', texto: textos.porResolver },
  { nombre: 'libro-de-compras.retenciones.enteros', texto: textos.enteros },
];
</script>

<template>
  <nav
    aria-label="Secciones de retenciones"
    class="mb-4 flex gap-1 overflow-x-auto border-b border-tierra-200 print:hidden dark:border-tierra-700"
  >
    <RouterLink
      v-for="seccion in secciones"
      :key="seccion.nombre"
      :to="{ name: seccion.nombre }"
      class="-mb-px flex shrink-0 items-center gap-2 border-b-2 border-transparent px-4 py-2 text-sm font-medium text-tierra-600 hover:text-tierra-900 dark:text-tierra-300 dark:hover:text-white"
      exact-active-class="!border-campo-700 !text-campo-800 dark:!border-campo-400 dark:!text-campo-300"
    >
      {{ seccion.texto }}
      <span
        v-if="seccion.nombre.endsWith('por-resolver') && pendientes"
        class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-950 dark:text-red-300"
        :aria-label="`${pendientes} pendientes`"
      >
        {{ pendientes }}
      </span>
    </RouterLink>
  </nav>
</template>
