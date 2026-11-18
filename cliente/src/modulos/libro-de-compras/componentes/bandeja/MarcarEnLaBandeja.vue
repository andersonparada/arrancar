<script setup lang="ts">
import { ListChecks } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import { TEXTOS_DE_LAS_ACCIONES as acciones } from '../../textos-de-la-bandeja';

/**
 * Cómo marcar: toda la página o todo el filtro, aunque ocupe varias páginas. Lo marcado se conserva al cambiar de
 * página; mientras se trae el filtro se dice cuántas filas lleva.
 */
defineProps<{
  paginaMarcada: boolean;
  /** Filas que tiene el filtro en total y las que se ven en esta página. */
  total: number;
  enLaPagina: number;
  /** Cuántas filas lleva de traer; `null` si no está trayendo. */
  trayendo: number | null;
}>();
const emit = defineEmits<{ alternarPagina: []; marcarElFiltro: [] }>();
</script>

<template>
  <div class="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
    <label class="flex min-h-11 w-fit cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        class="size-5 rounded border-tierra-300 text-campo-600 focus:ring-campo-500"
        :checked="paginaMarcada"
        @change="emit('alternarPagina')"
      />
      {{ acciones.marcarTodas }}
    </label>
    <BotonBase
      v-if="total > enLaPagina"
      variante="secundario"
      pequeno
      :icono="ListChecks"
      :cargando="trayendo !== null"
      class="min-h-11 w-fit sm:min-h-0"
      @click="emit('marcarElFiltro')"
    >
      {{ acciones.marcarElFiltro(total) }}
    </BotonBase>
    <p v-if="trayendo !== null" class="text-sm text-tierra-600 dark:text-tierra-300" role="status">
      Trayendo {{ trayendo }} de {{ total }}…
    </p>
  </div>
</template>
