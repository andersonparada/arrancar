<script setup lang="ts">
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { EdicionDeCombustible } from '../../composables/combustibles/edicion-de-combustible';

/** Los campos del combustible; los usan la ventana y el formulario en página, así se ven igual. */
defineProps<{ errores: Record<string, string> }>();
const edicion = defineModel<EdicionDeCombustible>({ required: true });
</script>

<template>
  <div class="space-y-4">
    <CampoTexto v-model="edicion.nombre" etiqueta="Nombre" requerido :error="errores.nombre" />
    <p class="text-xs text-tierra-600 dark:text-tierra-300">
      Las tasas de IDP se registran después, desde «Tasas de IDP» en la tarjeta del combustible.
    </p>
  </div>
</template>
