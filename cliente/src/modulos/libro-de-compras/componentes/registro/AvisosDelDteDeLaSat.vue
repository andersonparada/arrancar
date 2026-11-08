<script setup lang="ts">
import { FileInput } from 'lucide-vue-next';
import { DESDE_LA_SAT as textos } from '../../textos-del-registro';

/** Lo que el formulario trae de la fila de la SAT y lo que el usuario debe revisar o elegir antes de registrar. */
defineProps<{ cargando: boolean; avisos: string[] }>();
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
    <ul v-if="!cargando && avisos.length" class="mt-2 list-disc space-y-1.5 pl-6 wrap-break-word">
      <li v-for="aviso in avisos" :key="aviso">{{ aviso }}</li>
    </ul>
  </section>
</template>
