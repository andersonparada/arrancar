<script setup lang="ts">
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { etiquetaDePeriodo } from '../../composables/documentos/filtros-de-documentos';
import type { LibroDelPeriodo } from '../../servicios/libro.api';
import { AYUDA_DEL_TIPO_DE_LIBRO, DESCRIPCION_DEL_TIPO_DE_LIBRO } from '../../textos-del-libro';

/** La empresa, su NIT, el período y qué tipo de libro es (completo o parte del libro único). */
defineProps<{ libro: LibroDelPeriodo }>();
</script>

<template>
  <div class="mb-4 rounded-2xl bg-white p-4 ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700">
    <div class="flex flex-wrap items-center gap-2">
      <h2 class="text-lg font-semibold">{{ libro.empresa.nombre }}</h2>
      <InsigniaBase :tono="libro.tipoDeLibro === 'completo' ? 'campo' : 'trigo'">
        {{ DESCRIPCION_DEL_TIPO_DE_LIBRO[libro.tipoDeLibro] }}
      </InsigniaBase>
    </div>
    <p class="mt-1 text-sm text-tierra-600 dark:text-tierra-300">
      NIT {{ libro.empresa.nit ?? 'sin registrar' }} · {{ etiquetaDePeriodo(libro.periodo) }}
    </p>
    <p class="mt-1 text-sm text-tierra-600 dark:text-tierra-300">{{ AYUDA_DEL_TIPO_DE_LIBRO[libro.tipoDeLibro] }}</p>
  </div>
</template>
