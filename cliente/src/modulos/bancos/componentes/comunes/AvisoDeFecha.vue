<script setup lang="ts">
import { computed } from 'vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { avisoDeFechaFutura, fechaDeHoyEn } from '../../composables/comunes/aviso-de-fecha';

/** Aviso bajo el campo de fecha cuando es posterior a hoy (fecha de la zona horaria de la empresa). */
const props = defineProps<{ fecha: string; cheque?: boolean }>();
const { config } = usarSesion();

const aviso = computed(() => {
  const hoy = fechaDeHoyEn(config('core.regional.zona_horaria', 'America/Guatemala'));
  return avisoDeFechaFutura(props.fecha, hoy, props.cheque);
});
</script>

<template>
  <p
    v-if="aviso"
    role="status"
    class="rounded-md border px-3 py-2 text-sm"
    :class="
      aviso.nivel === 'atencion'
        ? 'border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-200'
        : 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-200'
    "
  >
    {{ aviso.texto }}
  </p>
</template>
