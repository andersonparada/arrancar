<script setup lang="ts">
import { FileInput, TriangleAlert } from 'lucide-vue-next';
import { DESDE_LA_SAT as textos } from '../../textos-del-registro';

/**
 * Lo que el formulario trae de la fila de la SAT: los avisos del servidor (p. ej. que la SAT anuló el DTE), de forma
 * destacada, y lo que el usuario debe elegir antes de registrar (desaparece al elegirlo).
 */
defineProps<{ cargando: boolean; avisos: string[]; pendientes: string[] }>();
</script>

<template>
  <section
    class="mb-4 rounded-2xl bg-campo-100 p-4 text-sm text-tierra-900 dark:bg-campo-900/40 dark:text-tierra-100"
    role="status"
    :aria-label="textos.titulo"
    :aria-busy="cargando"
  >
    <p class="flex items-start gap-2 font-semibold">
      <FileInput class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{{ cargando ? textos.cargando : textos.titulo }}</span>
    </p>
    <ul
      v-if="!cargando && avisos.length"
      class="mt-3 space-y-1.5 rounded-xl bg-trigo-300/40 p-3 font-medium wrap-break-word dark:bg-trigo-500/20 dark:text-trigo-300"
      role="alert"
    >
      <li v-for="aviso in avisos" :key="aviso" class="flex gap-2">
        <TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{{ aviso }}</span>
      </li>
    </ul>
    <ul v-if="!cargando && pendientes.length" class="mt-2 list-disc space-y-1.5 pl-6 wrap-break-word">
      <li v-for="pendiente in pendientes" :key="pendiente">{{ pendiente }}</li>
    </ul>
  </section>
</template>
