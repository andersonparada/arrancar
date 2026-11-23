<script setup lang="ts">
import { Undo2 } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { LineaPorRecibir } from '../../servicios/recepciones.api';

/** Lo que se descartó en esta visita: si fue un error, un clic devuelve la línea a la bandeja. */
defineProps<{ lineas: LineaPorRecibir[] }>();
const emit = defineEmits<{ devolver: [linea: LineaPorRecibir] }>();
</script>

<template>
  <TarjetaBase v-if="lineas.length" class="mb-4" aria-labelledby="titulo-descartadas">
    <h2 id="titulo-descartadas" class="font-semibold">Descartadas hace un momento</h2>
    <p class="text-sm text-tierra-600 dark:text-tierra-300">
      Ya no son inventario en el Libro de compras. Si fue un error, devuélvalas a la bandeja.
    </p>
    <ul class="mt-2 divide-y divide-tierra-100 dark:divide-tierra-800">
      <li v-for="linea in lineas" :key="linea.lineaId" class="flex flex-wrap items-center justify-between gap-2 py-2">
        <span class="min-w-0 text-sm">
          {{ linea.documento }} · línea {{ linea.numeroDeLinea }} · {{ linea.conceptoNombre }} ({{
            formatearMonto(linea.pendiente)
          }})
        </span>
        <span v-permiso="'inventarios.recepciones.descartar'" class="contents">
          <BotonBase variante="secundario" pequeno :icono="Undo2" @click="emit('devolver', linea)">
            Devolver a la bandeja
          </BotonBase>
        </span>
      </li>
    </ul>
  </TarjetaBase>
</template>
