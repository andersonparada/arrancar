<script setup lang="ts">
import { useId } from 'vue';
import type { GrupoDeLocalidad } from '../../composables/parcelas/arbol-de-parcelas';
import type { MostrarSuperficie } from '../../composables/parcelas/detalles-de-parcela';
import FilaDelArbol from './FilaDelArbol.vue';

/** Las parcelas de una localidad como árbol, con cuántas son y cuánto suman. */
defineProps<{ grupo: GrupoDeLocalidad; mostrar: MostrarSuperficie }>();
const emit = defineEmits<{ alternar: [parcelaId: string] }>();
const id = useId();
</script>

<template>
  <section :aria-labelledby="id" class="space-y-3">
    <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 :id="id" class="text-lg font-semibold">{{ grupo.localidadNombre }}</h2>
      <p class="text-sm text-tierra-600 dark:text-tierra-300">
        {{ grupo.cantidad }} {{ grupo.cantidad === 1 ? 'parcela' : 'parcelas' }} · Superficie total
        {{ mostrar(grupo.superficieTotalM2) }}
      </p>
    </div>
    <ul class="space-y-3">
      <FilaDelArbol
        v-for="fila in grupo.filas"
        :key="fila.nodo.id"
        :fila="fila"
        :mostrar="mostrar"
        @alternar="emit('alternar', fila.nodo.id)"
      />
    </ul>
  </section>
</template>
