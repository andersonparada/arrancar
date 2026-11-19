<script setup lang="ts">
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { opcionesDeLista } from '@/modulos/core/utilidades/edicion';
import { OPCIONES_DE_TIPO_DE_INVENTARIO_POR_OMISION } from '../../composables/categorias/edicion-de-categoria';
import type { EdicionDeCategoria } from '../../composables/categorias/edicion-de-categoria';

/** Los campos de la categoría; los usan la ventana y el formulario en página, así se ven igual. */
defineProps<{ errores: Record<string, string> }>();
const edicion = defineModel<EdicionDeCategoria>({ required: true });
</script>

<template>
  <div class="space-y-4">
    <CampoTexto v-model="edicion.nombre" etiqueta="Nombre" requerido :error="errores.nombre" />
    <CampoSelector
      v-model="edicion.tipoDeInventarioPorOmision"
      etiqueta="Tipo de inventario por omisión"
      :opciones="opcionesDeLista(OPCIONES_DE_TIPO_DE_INVENTARIO_POR_OMISION, false)"
      requerido
      :error="errores.tipoDeInventarioPorOmision"
    />
    <CampoInterruptor v-model="edicion.activo" etiqueta="Activo" />
  </div>
</template>
