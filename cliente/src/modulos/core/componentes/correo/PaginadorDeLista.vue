<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
import { rangoDeLaPagina, totalDePaginas } from '../../composables/correo/estado-del-correo';
import BotonBase from '../BotonBase.vue';

/** El pie de una lista paginada: qué filas se ven y cómo pasar de página. La página empieza en 1. */
const props = defineProps<{ limite: number; total: number }>();
const pagina = defineModel<number>({ required: true });
const paginas = () => totalDePaginas(props.limite, props.total);
</script>

<template>
  <nav
    v-if="total > 0"
    class="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-tierra-600 dark:text-tierra-300"
    aria-label="Páginas de la lista"
  >
    <p aria-live="polite">{{ rangoDeLaPagina(pagina, limite, total) }}</p>
    <div v-if="paginas() > 1" class="flex items-center gap-2">
      <BotonBase variante="secundario" pequeno :icono="ChevronLeft" :deshabilitado="pagina <= 1" @click="pagina--">
        Anterior
      </BotonBase>
      <span>Página {{ pagina }} de {{ paginas() }}</span>
      <BotonBase
        variante="secundario"
        pequeno
        :icono="ChevronRight"
        :deshabilitado="pagina >= paginas()"
        @click="pagina++"
      >
        Siguiente
      </BotonBase>
    </div>
  </nav>
</template>
