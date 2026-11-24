<script setup lang="ts">
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { EdicionDeBodega } from '../../composables/bodegas/edicion-de-bodega';

/** Los campos de la bodega; el formulario en página los usa. */
defineProps<{
  errores: Record<string, string>;
  opciones: { localidadId: OpcionDeRegistro[]; responsableUsuarioId: OpcionDeRegistro[] };
  puedeElegirLocalidad: boolean;
  puedeElegirResponsable: boolean;
}>();
const edicion = defineModel<EdicionDeBodega>({ required: true });
</script>

<template>
  <div class="space-y-4">
    <CampoTexto v-model="edicion.codigo" etiqueta="Código" requerido sin-correccion :error="errores.codigo" />
    <CampoTexto v-model="edicion.nombre" etiqueta="Nombre" requerido :error="errores.nombre" />
    <CampoSelector
      v-if="puedeElegirLocalidad"
      v-model="edicion.localidadId"
      etiqueta="Localidad"
      :opciones="opciones.localidadId"
      :error="errores.localidadId"
    />
    <CampoTexto
      v-model="edicion.responsable"
      etiqueta="Responsable"
      ayuda="El nombre de quien cuida la bodega, aunque no tenga usuario en el sistema."
      :error="errores.responsable"
    />
    <CampoSelector
      v-if="puedeElegirResponsable"
      v-model="edicion.responsableUsuarioId"
      etiqueta="Usuario responsable"
      :opciones="opciones.responsableUsuarioId"
      :error="errores.responsableUsuarioId"
    />
    <p v-if="puedeElegirResponsable" class="-mt-2 text-xs text-tierra-500">
      Si elige un usuario, recibe acceso a esta bodega automáticamente.
    </p>
    <CampoInterruptor
      v-model="edicion.activo"
      etiqueta="Activa"
      descripcion="Una bodega inactiva no recibe movimientos nuevos."
    />
  </div>
</template>
