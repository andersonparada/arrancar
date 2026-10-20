<script setup lang="ts">
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { LineaEnEdicion } from '../../composables/documentos/lineas-del-documento';

/** En una línea de combustible: usar el IDP que dice la factura en vez de calcularlo de los galones. */
defineProps<{ errores: Record<string, string> }>();
const linea = defineModel<LineaEnEdicion>({ required: true });
</script>

<template>
  <div class="space-y-3 sm:col-span-2 lg:col-span-4">
    <CampoInterruptor
      v-model="linea.escribeIdp"
      etiqueta="Escribir el IDP que dice la factura"
      descripcion="Úselo si no sabe los galones o la tasa. Si da los galones también, le avisamos si no cuadran."
    />
    <CampoTexto
      v-if="linea.escribeIdp"
      v-model="linea.idpEscrito"
      class="sm:max-w-xs"
      tipo="number"
      paso="any"
      etiqueta="IDP de la factura (Q)"
      requerido
      ayuda="Está incluido en el total de la línea."
      :error="errores.idpEscrito"
    />
  </div>
</template>
