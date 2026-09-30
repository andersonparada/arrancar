<script setup lang="ts">
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { opcionesDeLista } from '@/modulos/core/utilidades/edicion';
import { OPCIONES_DE_TIPO_POR_OMISION } from '../../composables/conceptos-de-gasto/edicion-de-concepto-de-gasto';
import type { EdicionDeConceptoDeGasto } from '../../composables/conceptos-de-gasto/edicion-de-concepto-de-gasto';

/** Los campos del concepto de gasto; los usan la ventana y el formulario en página, así se ven igual. */
defineProps<{ errores: Record<string, string> }>();
const edicion = defineModel<EdicionDeConceptoDeGasto>({ required: true });
</script>

<template>
  <div class="space-y-4">
    <CampoTexto v-model="edicion.nombre" etiqueta="Nombre" requerido :error="errores.nombre" />
    <CampoSelector
      v-model="edicion.tipoPorOmision"
      etiqueta="Tipo por omisión"
      :opciones="opcionesDeLista(OPCIONES_DE_TIPO_POR_OMISION, false)"
      requerido
      :error="errores.tipoPorOmision"
    />
    <CampoInterruptor v-model="edicion.esProductoAgropecuario" etiqueta="Es producto agropecuario" />
    <CampoInterruptor v-model="edicion.esActivoFijo" etiqueta="Es activo fijo" />
    <CampoInterruptor v-model="edicion.activo" etiqueta="Activo" />
  </div>
</template>
