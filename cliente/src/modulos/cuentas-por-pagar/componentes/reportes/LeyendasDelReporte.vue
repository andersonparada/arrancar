<script setup lang="ts">
import { Info } from 'lucide-vue-next';
import type { AvisoDelReporte } from '../../servicios/tipos-de-reportes';

/** Los avisos del reporte (algo que puede cambiar la lectura de las cifras) y sus leyendas contables. */
defineProps<{ avisos: AvisoDelReporte[]; leyendas: string[] }>();
</script>

<template>
  <section v-if="avisos.length || leyendas.length" aria-label="Avisos y leyendas" class="space-y-3">
    <ul v-if="avisos.length" class="space-y-2">
      <li
        v-for="aviso in avisos"
        :key="aviso.codigo + aviso.mensaje"
        class="flex gap-2 rounded-xl bg-trigo-300/30 px-3 py-2 text-sm text-tierra-800 dark:bg-trigo-500/15 dark:text-trigo-300"
      >
        <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{{ aviso.mensaje }}</span>
      </li>
    </ul>
    <ul v-if="leyendas.length" class="space-y-1 text-xs text-tierra-600 dark:text-tierra-300">
      <li v-for="leyenda in leyendas" :key="leyenda">{{ leyenda }}</li>
    </ul>
  </section>
</template>
