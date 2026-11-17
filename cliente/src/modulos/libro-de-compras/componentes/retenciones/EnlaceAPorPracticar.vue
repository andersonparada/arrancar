<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
</script>

<template>
  <p
    class="rounded-xl bg-tierra-50 px-3 py-2 text-sm ring-1 ring-tierra-200/70 print:hidden dark:bg-tierra-800/60 dark:ring-tierra-700"
  >
    Las retenciones que la empresa todavía no practicó de sus saldos iniciales se ven aparte, en Cuentas por pagar.
    <RouterLink
      :to="{ name: 'cuentas-por-pagar.reportes.documentos', query: { vista: 'retenciones_por_practicar' } }"
      class="inline-flex items-center gap-1 font-medium underline underline-offset-2"
    >
      Ver retenciones por practicar <ArrowRight class="size-4" aria-hidden="true" />
    </RouterLink>
  </p>
</template>
