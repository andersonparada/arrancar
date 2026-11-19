<script setup lang="ts">
import { ExternalLink, TriangleAlert } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import { hayAvisoDeConstancia } from '../composables/pagos/avisos-del-pago';

/** Los avisos que no bloquean: se leen antes de confirmar (o, ya registrado, los que dijo el servidor y Bancos). */
defineProps<{ avisos: string[]; titulo?: string }>();
const RUTA_DE_CONSTANCIAS = { name: 'libro-de-compras.retenciones.constancias-pendientes' };
</script>

<template>
  <section
    v-if="avisos.length > 0"
    class="rounded-xl bg-trigo-300/30 p-4 ring-1 ring-trigo-500/40 dark:bg-trigo-500/10"
    aria-label="Avisos del pago"
    role="status"
  >
    <h3 class="mb-2 flex items-center gap-2 text-sm font-semibold text-tierra-900 dark:text-trigo-300">
      <TriangleAlert class="size-4 shrink-0" aria-hidden="true" />
      {{ titulo ?? 'Tenga en cuenta (no impide registrar el pago)' }}
    </h3>
    <ul class="list-disc space-y-1.5 pl-5 text-sm text-tierra-800 dark:text-tierra-100">
      <li v-for="aviso in avisos" :key="aviso">{{ aviso }}</li>
    </ul>
    <RouterLink
      v-if="hayAvisoDeConstancia(avisos)"
      v-permiso="'libro-de-compras.retenciones.ver'"
      :to="RUTA_DE_CONSTANCIAS"
      class="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-campo-700 underline dark:text-campo-300"
    >
      <ExternalLink class="size-4" aria-hidden="true" />
      Ver las constancias de retención pendientes
    </RouterLink>
  </section>
</template>
