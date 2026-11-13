<script setup lang="ts">
import { ref } from 'vue';
import { ChevronDown, ChevronRight } from 'lucide-vue-next';
import type { ItemDeConciliacion } from '../../servicios/conciliacion.api';
import { ANTERIORES_A_LA_FECHA_DE_INICIO as textos } from '../../textos-de-anteriores';
import type { AccionDeConciliacion } from '../../textos-de-la-conciliacion';
import LineaDeConciliacion from './LineaDeConciliacion.vue';

/**
 * Lo emitido en el mes antes de la fecha de inicio y sin factura en Arrancar: informativo, aparte y plegado, porque
 * esas facturas deben estar en el libro del sistema anterior y no son una diferencia por corregir.
 */
const props = defineProps<{ items: ItemDeConciliacion[]; cargando: boolean }>();
const emit = defineEmits<{ accion: [accion: AccionDeConciliacion, item: ItemDeConciliacion] }>();
const abierto = ref(false);
</script>

<template>
  <section v-if="props.items.length" class="mt-6 border-t border-tierra-200 pt-4 dark:border-tierra-700">
    <h3 class="text-base">
      <button
        type="button"
        class="flex min-h-11 w-full items-center gap-2 rounded-lg text-left font-medium text-tierra-700 hover:bg-tierra-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-campo-500 dark:text-tierra-200 dark:hover:bg-tierra-800"
        aria-controls="grupo-de-anteriores"
        :aria-expanded="abierto"
        @click="abierto = !abierto"
      >
        <component :is="abierto ? ChevronDown : ChevronRight" class="size-5 shrink-0" aria-hidden="true" />
        <span class="min-w-0 flex-1">{{ textos.grupo }}</span>
        <span class="shrink-0 text-2xl font-semibold tabular-nums">{{ props.items.length }}</span>
      </button>
    </h3>
    <div v-show="abierto" id="grupo-de-anteriores">
      <p class="mb-3 text-sm text-tierra-600 dark:text-tierra-300">{{ textos.ayuda }}</p>
      <ul
        class="grid grid-cols-1 gap-3 opacity-90 md:grid-cols-2"
        :class="{ 'opacity-60': props.cargando }"
        :aria-busy="props.cargando"
      >
        <li v-for="item in props.items" :key="`${item.dteId}-${item.numero}`">
          <LineaDeConciliacion clave="anterioresALaFechaDeInicio" :item="item" @accion="emit('accion', $event, item)" />
        </li>
      </ul>
    </div>
  </section>
</template>
