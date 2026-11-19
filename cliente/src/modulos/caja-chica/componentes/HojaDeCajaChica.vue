<script setup lang="ts">
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { formatearNit, formatearTexto } from '@/modulos/core/utilidades/formato';

/**
 * El marco de las hojas de Caja chica: empresa con su NIT, el sello del documento, el título, el contenido y las líneas de
 * firma. Siempre blanca con letra negra (también en modo oscuro), en hoja carta.
 */
defineProps<{ sello: string; titulo: string; firmas: readonly string[] }>();
const sesion = usarSesion();
</script>

<template>
  <article
    class="mx-auto w-full max-w-[8.5in] space-y-4 bg-white p-4 text-black ring-1 ring-tierra-300 sm:p-8 print:max-w-none print:p-0 print:ring-0"
    :aria-label="sello"
  >
    <header class="flex flex-wrap items-start justify-between gap-2 border-b-2 border-black pb-2">
      <div>
        <p class="text-lg font-bold">{{ formatearTexto(sesion.empresa?.nombre) }}</p>
        <p v-if="sesion.empresa?.nit" class="text-sm">NIT {{ formatearNit(sesion.empresa.nit) }}</p>
      </div>
      <p class="border-2 border-black px-3 py-1 text-sm font-bold tracking-wide uppercase">{{ sello }}</p>
    </header>
    <h2 class="text-xl font-bold">{{ titulo }}</h2>
    <slot />
    <div class="grid grid-cols-1 gap-x-8 gap-y-2 pt-6 sm:grid-cols-3 print:grid-cols-3">
      <p v-for="firma in firmas" :key="firma" class="mt-10 border-t border-black pt-1 text-xs">
        {{ firma }}: nombre, firma y fecha
      </p>
    </div>
  </article>
</template>
