<script setup lang="ts">
/** Qué significa cada sigla de la columna «Motivo». */
defineProps<{ leyenda: Array<{ sigla: string; descripcion: string }> }>();
</script>

<template>
  <section aria-label="Leyenda de siglas" class="mt-4 text-sm">
    <h2 class="font-semibold text-tierra-800 dark:text-tierra-100">Leyenda del motivo</h2>
    <dl class="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
      <div v-for="entrada in leyenda" :key="entrada.sigla" class="flex gap-2">
        <dt class="w-10 shrink-0 font-semibold">{{ entrada.sigla }}</dt>
        <dd class="text-tierra-600 dark:text-tierra-300">{{ entrada.descripcion }}</dd>
      </div>
    </dl>
  </section>
</template>
