<script setup lang="ts">
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type { MarcaDeMovimiento } from '../composables/movimientos/detalles-de-movimientos';

/** Una reposición, un arqueo o un vale en la ficha del fondo: título, marca de estado, datos, notas y acciones. */
defineProps<{
  titulo: string;
  marca: MarcaDeMovimiento | null;
  detalles: DetalleDeRegistro[];
  /** Motivos y avisos que acompañan al registro. */
  notas?: string[];
  anulado?: boolean;
}>();
</script>

<template>
  <TarjetaBase class="space-y-3" :class="anulado ? 'opacity-70' : ''">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <h3 class="min-w-0 font-semibold">{{ titulo }}</h3>
      <InsigniaBase v-if="marca" :tono="marca.tono">{{ marca.texto }}</InsigniaBase>
    </div>
    <dl class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-4">
      <div v-for="detalle in detalles" :key="detalle.etiqueta" class="min-w-0">
        <dt class="text-xs text-tierra-500">{{ detalle.etiqueta }}</dt>
        <dd class="break-words">{{ detalle.valor }}</dd>
      </div>
    </dl>
    <p v-for="nota in notas ?? []" :key="nota" class="text-sm text-tierra-600 dark:text-tierra-300">{{ nota }}</p>
    <div v-if="$slots.default" class="flex flex-wrap gap-2"><slot /></div>
  </TarjetaBase>
</template>
