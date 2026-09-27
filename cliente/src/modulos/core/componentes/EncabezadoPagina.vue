<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next';
import { RouterLink, type RouteLocationRaw } from 'vue-router';

/** `volver` pone arriba del título el enlace a la pantalla de la que se vino (la lista, la ficha…). */
defineProps<{ titulo: string; descripcion?: string; volver?: { texto: string; ruta: RouteLocationRaw } }>();
</script>

<template>
  <header class="mb-6">
    <RouterLink
      v-if="volver"
      :to="volver.ruta"
      class="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-tierra-600 hover:text-tierra-900 dark:text-tierra-300 dark:hover:text-white"
    >
      <ArrowLeft class="size-4" aria-hidden="true" />
      {{ volver.texto }}
    </RouterLink>
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-tierra-900 dark:text-white">{{ titulo }}</h1>
        <p v-if="descripcion" class="mt-1 text-sm text-tierra-600 dark:text-tierra-300">{{ descripcion }}</p>
      </div>
      <div v-if="$slots.default" class="flex flex-wrap gap-2">
        <slot />
      </div>
    </div>
  </header>
</template>
