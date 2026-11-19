<script setup lang="ts">
import type { MovimientoConMarca } from '../../servicios/conciliaciones.api';
import ListaDeMovimientosConciliables from './ListaDeMovimientosConciliables.vue';

/** Los documentos que se pueden marcar: los del mes y, aparte, los cheques con fecha posterior (posfechados). */
defineProps<{ movimientos: MovimientoConMarca[]; posfechados: MovimientoConMarca[]; editable: boolean }>();
const emit = defineEmits<{ alternar: [movimientoId: string] }>();
</script>

<template>
  <div class="space-y-4">
    <ListaDeMovimientosConciliables
      :movimientos="movimientos"
      :editable="editable"
      @alternar="emit('alternar', $event)"
    />
    <ListaDeMovimientosConciliables
      :movimientos="posfechados"
      :editable="editable"
      posfechados
      @alternar="emit('alternar', $event)"
    />
  </div>
</template>
