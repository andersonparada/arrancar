<script setup lang="ts">
import { computed } from 'vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';

/** Una medida (milímetros o puntos) con decimales: guarda siempre un número; si se borra, queda sin valor y el servidor avisa. */
defineProps<{ etiqueta: string; ayuda?: string; error?: string }>();
const medida = defineModel<number>({ required: true });

const texto = computed({
  get: () => (Number.isFinite(medida.value) ? medida.value : ''),
  set: (nuevo: string | number | null | undefined) =>
    (medida.value = nuevo === '' || nuevo === null || nuevo === undefined ? Number.NaN : Number(nuevo)),
});
</script>

<template>
  <CampoTexto v-model="texto" :etiqueta="etiqueta" tipo="number" paso="any" requerido :ayuda="ayuda" :error="error" />
</template>
