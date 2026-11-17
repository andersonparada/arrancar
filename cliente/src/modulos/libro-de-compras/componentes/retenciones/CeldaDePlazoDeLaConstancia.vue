<script setup lang="ts">
import { computed } from 'vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import {
  textoDelPlazoDeLaConstancia,
  tonoDelPlazoDeLaConstancia,
} from '../../composables/retenciones/datos-de-constancias-pendientes';
import type { ConstanciaPendiente } from '../../servicios/constancias-pendientes.api';

/** El plazo de la constancia: la fecha límite y si ya venció; el IVA dice que no tiene plazo propio. */
const props = defineProps<{ fila: ConstanciaPendiente }>();
const plazo = computed(() => textoDelPlazoDeLaConstancia(props.fila));
const tono = computed(() => tonoDelPlazoDeLaConstancia(props.fila));
</script>

<template>
  <div class="space-y-0.5">
    <p v-if="plazo.fecha" class="tabular-nums">{{ plazo.fecha }}</p>
    <InsigniaBase :tono="tono">{{ plazo.estado }}</InsigniaBase>
  </div>
</template>
