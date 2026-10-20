<script setup lang="ts">
import { LockKeyhole } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import { PERIODO_BLOQUEADO } from '../../textos-de-periodos';

/** El período del documento está declarado y bloqueado: dice por qué no se pudo y lleva a reabrirlo. */
defineProps<{ mensaje: string }>();
</script>

<template>
  <div
    class="flex gap-2 rounded-2xl bg-trigo-300/40 p-4 text-sm text-tierra-900 dark:bg-trigo-500/20 dark:text-trigo-300"
    role="alert"
  >
    <LockKeyhole class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
    <div class="min-w-0 space-y-2">
      <p>{{ mensaje }}</p>
      <RouterLink
        v-permiso="'libro-de-compras.periodos.ver'"
        :to="{ name: 'libro-de-compras.periodos' }"
        class="inline-block font-medium underline underline-offset-2"
      >
        {{ PERIODO_BLOQUEADO.irAPeriodos }}
      </RouterLink>
    </div>
  </div>
</template>
