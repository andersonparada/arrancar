<script setup lang="ts">
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { opcionesDeLista } from '@/modulos/core/utilidades/edicion';
import { OPCIONES_DE_TIPO } from '../../composables/conceptos-de-ingreso/edicion-de-concepto-de-ingreso';
import type { EdicionDeConceptoDeIngreso } from '../../composables/conceptos-de-ingreso/edicion-de-concepto-de-ingreso';

/** Los campos del concepto de ingreso; los usan la ventana y el formulario en página, así se ven igual. */
defineProps<{ errores: Record<string, string> }>();
const edicion = defineModel<EdicionDeConceptoDeIngreso>({ required: true });
</script>

<template>
  <div class="space-y-4">
    <CampoTexto v-model="edicion.nombre" etiqueta="Nombre" requerido :error="errores.nombre" />
    <CampoSelector
      v-model="edicion.tipo"
      etiqueta="Tipo"
      :opciones="opcionesDeLista(OPCIONES_DE_TIPO, false)"
      requerido
      :error="errores.tipo"
    />
    <CampoInterruptor v-model="edicion.activo" etiqueta="Activo" />
  </div>
</template>
