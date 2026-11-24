<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import { rangoMostrado } from '../../composables/documentos/filtros-de-documentos';

/** El pie de una lista paginada: qué filas se ven y cómo pasar de página. La página empieza en 1. */
defineProps<{ paginas: number; limite: number; total: number }>();
const pagina = defineModel<number>({ required: true });
</script>

<template>
  <nav
    v-if="total > 0"
    class="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-tierra-600 dark:text-tierra-300"
    aria-label="Páginas de la lista"
  >
    <p aria-live="polite">{{ rangoMostrado(pagina, limite, total) }}</p>
    <div v-if="paginas > 1" class="flex items-center gap-2">
      <BotonBase variante="secundario" pequeno :icono="ChevronLeft" :deshabilitado="pagina <= 1" @click="pagina--">
        Anterior
      </BotonBase>
      <span>Página {{ pagina }} de {{ paginas }}</span>
      <BotonBase
        variante="secundario"
        pequeno
        :icono="ChevronRight"
        :deshabilitado="pagina >= paginas"
        @click="pagina++"
      >
        Siguiente
      </BotonBase>
    </div>
  </nav>
</template>
