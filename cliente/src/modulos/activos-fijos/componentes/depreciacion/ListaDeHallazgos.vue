<script setup lang="ts">
import { CircleAlert, TriangleAlert } from 'lucide-vue-next';
import { activosDelHallazgo, hallazgosOrdenados } from '../../composables/depreciacion/logica-de-cierre';
import type { Hallazgo } from '../../servicios/depreciacion.api';

/** Lo que se encontró al revisar el mes: lo que bloquea (rojo) y los avisos (ámbar), con los activos afectados. */
defineProps<{ hallazgos: Hallazgo[] }>();
</script>

<template>
  <ul class="space-y-2">
    <li
      v-for="hallazgo in hallazgosOrdenados(hallazgos)"
      :key="hallazgo.codigo"
      class="flex gap-2 rounded-lg border p-3 text-sm"
      :class="
        hallazgo.nivel === 'bloquea'
          ? 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200'
          : 'border-trigo-500/50 bg-trigo-300/20 text-tierra-900 dark:border-trigo-500/40 dark:bg-trigo-500/10 dark:text-tierra-100'
      "
    >
      <component
        :is="hallazgo.nivel === 'bloquea' ? CircleAlert : TriangleAlert"
        class="mt-0.5 size-4 shrink-0"
        aria-hidden="true"
      />
      <div class="min-w-0">
        <p class="font-medium">
          <span class="sr-only">{{ hallazgo.nivel === 'bloquea' ? 'Impide cerrar: ' : 'Aviso: ' }}</span>
          {{ hallazgo.mensaje }}
        </p>
        <p v-if="activosDelHallazgo(hallazgo)" class="mt-1 break-words text-xs opacity-80">
          Activos: {{ activosDelHallazgo(hallazgo) }}
        </p>
      </div>
    </li>
  </ul>
</template>
