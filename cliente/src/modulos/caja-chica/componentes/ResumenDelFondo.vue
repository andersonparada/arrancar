<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';

/** El dinero del fondo de un vistazo (monto, efectivo esperado, pendiente, vales) y los avisos que dio el servidor. */
defineProps<{ partes: DetalleDeRegistro[]; avisos: string[] }>();
</script>

<template>
  <section aria-label="Resumen del fondo" class="space-y-3">
    <dl class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <TarjetaBase v-for="parte in partes" :key="parte.etiqueta">
        <dt class="text-xs text-tierra-500">{{ parte.etiqueta }}</dt>
        <dd class="mt-1 text-lg font-semibold tabular-nums sm:text-xl">{{ parte.valor }}</dd>
      </TarjetaBase>
    </dl>
    <ul v-if="avisos.length > 0" class="space-y-2" aria-label="Avisos del fondo">
      <li
        v-for="aviso in avisos"
        :key="aviso"
        class="flex gap-2 rounded-2xl bg-trigo-300/40 p-3 text-sm text-tierra-900 dark:bg-trigo-500/20 dark:text-trigo-300"
        role="status"
      >
        <TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{{ aviso }}</span>
      </li>
    </ul>
  </section>
</template>
