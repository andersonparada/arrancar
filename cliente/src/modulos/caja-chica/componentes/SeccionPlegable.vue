<script setup lang="ts">
/** Una sección de la ficha que se pliega: el título dice cuántos registros tiene; abierta cuando hay algo que atender. */
defineProps<{ titulo: string; cantidad: number; abierta?: boolean }>();
</script>

<template>
  <details class="group rounded-2xl" :open="abierta">
    <summary
      class="cursor-pointer rounded-2xl px-1 py-2 text-lg font-semibold focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none"
    >
      {{ titulo }}
      <span class="text-sm font-normal text-tierra-500">({{ cantidad }})</span>
    </summary>
    <div class="space-y-3 pt-2">
      <slot />
    </div>
  </details>
</template>
