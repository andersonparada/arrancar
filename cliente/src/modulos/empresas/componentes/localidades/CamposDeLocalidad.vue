<script setup lang="ts">
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { EdicionDeLocalidad } from '../../composables/localidades/edicion-de-localidad';

/** Los campos de la localidad; los usan la ventana y el formulario en página, así se ven igual. */
defineProps<{
  errores: Record<string, string>;
  referencias: Record<'tipoId' | 'departamentoCodigo' | 'municipioCodigo', OpcionDeRegistro[]>;
}>();
const edicion = defineModel<EdicionDeLocalidad>({ required: true });
</script>

<template>
  <div class="space-y-4">
    <CampoTexto v-model="edicion.codigo" etiqueta="Código interno" requerido :error="errores.codigo" />
    <CampoTexto v-model="edicion.nombre" etiqueta="Nombre" requerido :error="errores.nombre" />
    <CampoSelector
      v-model="edicion.tipoId"
      etiqueta="Tipo"
      :opciones="referencias.tipoId"
      requerido
      :error="errores.tipoId"
    />
    <CampoTexto
      v-model="edicion.codigoEstablecimientoSat"
      etiqueta="Código de establecimiento SAT"
      tipo="number"
      :error="errores.codigoEstablecimientoSat"
    />
    <CampoTexto
      v-model="edicion.nombreComercialSat"
      etiqueta="Nombre comercial SAT"
      :error="errores.nombreComercialSat"
    />
    <div class="grid gap-4 sm:grid-cols-2">
      <CampoSelector
        v-model="edicion.departamentoCodigo"
        etiqueta="Departamento"
        :opciones="referencias.departamentoCodigo"
        :error="errores.departamentoCodigo"
      />
      <CampoSelector
        v-model="edicion.municipioCodigo"
        etiqueta="Municipio"
        :opciones="referencias.municipioCodigo"
        :error="errores.municipioCodigo"
      />
    </div>
    <CampoTexto v-model="edicion.direccion" etiqueta="Dirección" :error="errores.direccion" />
    <CampoInterruptor v-model="edicion.activo" etiqueta="Activo" />
  </div>
</template>
