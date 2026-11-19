<script setup lang="ts">
import { Undo2 } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { nombreDeLinea } from '../../composables/bandeja/textos-de-bandeja';
import type { LineaDeBandeja } from '../../servicios/bandeja.api';

/**
 * Las líneas que se descartaron en esta sesión, para devolverlas a la bandeja si fue un error. El servidor no
 * lista las descartadas: al recargar la página, esta lista empieza vacía.
 */
defineProps<{ lineas: LineaDeBandeja[] }>();
const emit = defineEmits<{ devolver: [linea: LineaDeBandeja] }>();
</script>

<template>
  <TarjetaBase v-if="lineas.length" class="mb-4">
    <h2 class="text-sm font-semibold text-tierra-600 dark:text-tierra-300">Descartadas hace un momento</h2>
    <ul class="mt-2 divide-y divide-tierra-200 dark:divide-tierra-700">
      <li v-for="linea in lineas" :key="linea.lineaId" class="flex items-center justify-between gap-3 py-2 text-sm">
        <span class="min-w-0 wrap-break-word">{{ nombreDeLinea(linea) }}</span>
        <BotonBase
          v-permiso="'activos-fijos.bandeja.descartar'"
          variante="secundario"
          pequeno
          :icono="Undo2"
          @click="emit('devolver', linea)"
        >
          Devolver a la bandeja
        </BotonBase>
      </li>
    </ul>
  </TarjetaBase>
</template>
