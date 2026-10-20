<script setup lang="ts">
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import { resumenDelRango, type RangoDeAnalisis } from '../../composables/analisis/datos-del-analisis';
import { VENTANA_DEL_ANALISIS as textos } from '../../textos-del-analisis';

/** Desde y hasta (mes y año); si el rango no se puede pedir, dice cómo corregirlo. */
defineProps<{
  opcionesDesde: OpcionBuscable<string>[];
  opcionesHasta: OpcionBuscable<string>[];
  problema: string | null;
}>();
const rango = defineModel<RangoDeAnalisis>({ required: true });
</script>

<template>
  <form class="mb-4 print:hidden" @submit.prevent>
    <div class="grid gap-3 sm:grid-cols-2 lg:max-w-xl">
      <CampoSelector v-model="rango.desde" :etiqueta="textos.desde" :opciones="opcionesDesde" />
      <CampoSelector v-model="rango.hasta" :etiqueta="textos.hasta" :opciones="opcionesHasta" />
    </div>
    <p v-if="problema" class="mt-2 text-sm font-medium text-red-700 dark:text-red-400" role="alert">{{ problema }}</p>
    <p v-else class="mt-2 text-sm text-tierra-600 dark:text-tierra-300">{{ resumenDelRango(rango) }}</p>
  </form>
</template>
