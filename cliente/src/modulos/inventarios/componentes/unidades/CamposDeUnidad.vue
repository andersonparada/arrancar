<script setup lang="ts">
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { opcionesDeLista } from '@/modulos/core/utilidades/edicion';
import { OPCIONES_DE_MAGNITUD, llevaFactor } from '../../composables/unidades/edicion-de-unidad';
import type { EdicionDeUnidad } from '../../composables/unidades/edicion-de-unidad';

/** Los campos de la unidad de medida; los usan la ventana y el formulario en página, así se ven igual. */
defineProps<{ errores: Record<string, string> }>();
const edicion = defineModel<EdicionDeUnidad>({ required: true });
</script>

<template>
  <div class="space-y-4">
    <CampoTexto v-model="edicion.nombre" etiqueta="Nombre" requerido :error="errores.nombre" />
    <CampoTexto v-model="edicion.simbolo" etiqueta="Símbolo" requerido :error="errores.simbolo" />
    <CampoSelector
      v-model="edicion.magnitud"
      etiqueta="Magnitud"
      :opciones="opcionesDeLista(OPCIONES_DE_MAGNITUD, false)"
      requerido
      :error="errores.magnitud"
    />
    <CampoTexto
      v-if="llevaFactor(edicion.magnitud)"
      v-model="edicion.factorALaReferencia"
      etiqueta="Factor a la unidad de referencia (libra, galón, metro o metro cuadrado)"
      requerido
      tipo="number"
      paso="any"
      :error="errores.factorALaReferencia"
    />
    <CampoInterruptor v-model="edicion.activo" etiqueta="Activo" />
  </div>
</template>
