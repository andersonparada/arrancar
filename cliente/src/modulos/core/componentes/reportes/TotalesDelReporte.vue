<script setup lang="ts">
/** Las cifras de arriba de un reporte (en el celular quedan antes de la tabla). */
defineProps<{ totales: Array<{ etiqueta: string; valor: string; destacado?: boolean }>; titulo: string }>();
</script>

<template>
  <section :aria-label="titulo">
    <dl class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 print:grid-cols-5 print:gap-2">
      <div
        v-for="total in totales"
        :key="total.etiqueta"
        class="rounded-xl bg-tierra-50 px-3 py-2 ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700 print:bg-transparent"
      >
        <dt class="text-xs text-tierra-500 dark:text-tierra-300">{{ total.etiqueta }}</dt>
        <dd class="tabular-nums" :class="total.destacado ? 'text-lg font-semibold' : 'text-base font-medium'">
          {{ total.valor }}
        </dd>
      </div>
    </dl>
  </section>
</template>
