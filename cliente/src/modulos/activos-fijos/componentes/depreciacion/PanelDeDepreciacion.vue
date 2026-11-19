<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { TrendingDown } from 'lucide-vue-next';
import DatosDelRegistro from '@/modulos/core/componentes/DatosDelRegistro.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import {
  detallesDeTramo,
  NOMBRES_DE_LIBRO,
  nombreDeCausa,
  tramosDelLibro,
  type LibroDeDepreciacion,
} from '../../composables/depreciacion/tramos-de-activo';
import type { TramoDeActivo } from '../../servicios/activos.api';

/** La pestaña Depreciación de la ficha: cómo se deprecia el activo en cada libro, tramo por tramo. */
defineProps<{ tramos: TramoDeActivo[]; enConstruccion: boolean }>();
const libros: LibroDeDepreciacion[] = ['contable', 'fiscal'];
</script>

<template>
  <section aria-labelledby="titulo-de-depreciacion" class="space-y-4">
    <h2 id="titulo-de-depreciacion" class="sr-only">Depreciación del activo</h2>
    <EstadoVacio
      v-if="!tramos.length"
      :icono="TrendingDown"
      titulo="Este activo todavía no se deprecia"
      :descripcion="
        enConstruccion
          ? 'Una obra en construcción no se deprecia: póngala en uso cuando se termine.'
          : 'La depreciación empieza cuando el activo se pone en uso. Los bienes de control y los de terceros no se deprecian.'
      "
    />
    <template v-else>
      <div v-for="libro in libros" :key="libro" class="space-y-2">
        <h3 class="text-sm font-semibold text-tierra-600 dark:text-tierra-300">{{ NOMBRES_DE_LIBRO[libro] }}</h3>
        <p v-if="!tramosDelLibro(tramos, libro).length" class="text-sm text-tierra-500">
          Sin depreciación en este libro.
        </p>
        <div v-for="tramo in tramosDelLibro(tramos, libro)" :key="tramo.desdePeriodo + tramo.causa" class="space-y-1">
          <InsigniaBase tono="campo">{{ nombreDeCausa(tramo.causa) }}</InsigniaBase>
          <DatosDelRegistro :detalles="detallesDeTramo(tramo)" />
        </div>
      </div>
      <p class="text-sm text-tierra-600 dark:text-tierra-300">
        Las cuotas se calculan al cerrar cada mes.
        <RouterLink
          v-permiso="'activos-fijos.depreciacion.ver'"
          :to="{ name: 'activos-fijos.depreciacion' }"
          class="text-campo-800 underline dark:text-campo-300"
        >
          Ir al cierre de depreciación
        </RouterLink>
      </p>
    </template>
  </section>
</template>
