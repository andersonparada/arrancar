<script setup lang="ts">
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import {
  codigoEnMayusculas,
  LARGO_MAXIMO_DEL_CODIGO,
  type EdicionDeDepartamento,
} from '../../composables/departamentos/edicion-de-departamento';

/** Los campos del departamento; los usan la ventana y el formulario en página, así se ven igual. */
defineProps<{ errores: Record<string, string>; referencias: Record<'localidadId', OpcionDeRegistro[]> }>();
const edicion = defineModel<EdicionDeDepartamento>({ required: true });
</script>

<template>
  <div class="space-y-4">
    <CampoTexto
      :model-value="edicion.codigo"
      etiqueta="Código interno"
      requerido
      sin-correccion
      :longitud-maxima="LARGO_MAXIMO_DEL_CODIGO"
      ayuda="Letras, números y guiones; se escribe en mayúsculas."
      :error="errores.codigo"
      @update:model-value="edicion.codigo = codigoEnMayusculas(String($event ?? ''))"
    />
    <CampoTexto v-model="edicion.nombre" etiqueta="Nombre" requerido :error="errores.nombre" />
    <CampoSelector
      v-model="edicion.localidadId"
      etiqueta="Localidad (opcional)"
      :opciones="referencias.localidadId"
      :error="errores.localidadId"
    />
    <CampoInterruptor v-model="edicion.activo" etiqueta="Activo" />
  </div>
</template>
