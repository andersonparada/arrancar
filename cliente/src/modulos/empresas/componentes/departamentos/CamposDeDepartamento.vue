<script setup lang="ts">
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { EdicionDeDepartamento } from '../../composables/departamentos/edicion-de-departamento';

/** Los campos del departamento; los usan la ventana y el formulario en página, así se ven igual. */
defineProps<{ errores: Record<string, string>; referencias: Record<'localidadId', OpcionDeRegistro[]> }>();
const edicion = defineModel<EdicionDeDepartamento>({ required: true });
</script>

<template>
  <div class="space-y-4">
    <CampoTexto v-model="edicion.codigo" etiqueta="Código interno" requerido :error="errores.codigo" />
    <CampoTexto v-model="edicion.nombre" etiqueta="Nombre" requerido :error="errores.nombre" />
    <CampoSelector
      v-model="edicion.localidadId"
      etiqueta="Localidad"
      :opciones="referencias.localidadId"
      :error="errores.localidadId"
    />
    <CampoInterruptor v-model="edicion.activo" etiqueta="Activo" />
  </div>
</template>
