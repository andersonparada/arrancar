<script setup lang="ts">
import type { Component } from 'vue';
import { LoaderCircle } from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{
    variante?: 'primario' | 'secundario' | 'peligro' | 'fantasma';
    tipo?: 'button' | 'submit';
    cargando?: boolean;
    deshabilitado?: boolean;
    icono?: Component;
    pequeno?: boolean;
  }>(),
  { variante: 'primario', tipo: 'button' },
);

const estilosVariante: Record<NonNullable<typeof props.variante>, string> = {
  primario: 'bg-campo-700 text-white hover:bg-campo-800 dark:bg-campo-600 dark:hover:bg-campo-500',
  secundario:
    'bg-white text-tierra-800 ring-1 ring-tierra-200 hover:bg-tierra-100 dark:bg-tierra-800 dark:text-tierra-100 dark:ring-tierra-700 dark:hover:bg-tierra-700',
  peligro: 'bg-red-700 text-white hover:bg-red-800',
  fantasma: 'text-tierra-700 hover:bg-tierra-100 dark:text-tierra-200 dark:hover:bg-tierra-800',
};
</script>

<template>
  <button
    :type="tipo"
    :disabled="deshabilitado || cargando"
    class="inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60"
    :class="[estilosVariante[variante], pequeno ? 'px-2.5 py-1.5 text-sm' : 'px-4 py-2.5 text-sm']"
  >
    <LoaderCircle v-if="cargando" class="size-4 animate-spin" aria-hidden="true" />
    <component :is="icono" v-else-if="icono" class="size-4" aria-hidden="true" />
    <slot />
  </button>
</template>
