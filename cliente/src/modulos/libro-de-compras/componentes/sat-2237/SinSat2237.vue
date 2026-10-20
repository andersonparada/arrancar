<script setup lang="ts">
import { Info } from 'lucide-vue-next';
import { VENTANA_DEL_SAT_2237 as textos } from '../../textos-del-sat-2237';

/** Lo que se muestra cuando el régimen de la empresa no declara compras en el SAT-2237. */
defineProps<{ formulario: string | null; mensaje: string }>();
</script>

<template>
  <div
    class="flex items-start gap-3 rounded-2xl bg-white p-5 ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700"
    role="status"
  >
    <Info class="mt-0.5 size-5 shrink-0 text-campo-700 dark:text-campo-300" aria-hidden="true" />
    <div>
      <h2 class="font-semibold">{{ textos.sinFormulario }}</h2>
      <p class="mt-1 text-sm">{{ mensaje }}</p>
      <p v-if="formulario" class="mt-1 text-sm text-tierra-600 dark:text-tierra-300">
        Su formulario de este período es el {{ formulario }}.
      </p>
    </div>
  </div>
</template>
