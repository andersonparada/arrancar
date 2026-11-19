<script setup lang="ts">
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { marcasDelComprobante } from '../composables/comprobantes/detalles-de-comprobante';
import type { Comprobante } from '../servicios/tipos-de-comprobantes';

/** Lo que el servidor marcó en el comprobante: retención, tope, bancarización, fuera del libro, anulado, repuesto. */
defineProps<{ comprobante: Comprobante }>();
</script>

<template>
  <ul v-if="marcasDelComprobante(comprobante).length > 0" class="flex flex-wrap gap-1.5" aria-label="Marcas">
    <li v-for="marca in marcasDelComprobante(comprobante)" :key="marca.texto">
      <InsigniaBase :tono="marca.tono">{{ marca.texto }}</InsigniaBase>
    </li>
  </ul>
</template>
