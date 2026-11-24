<script setup lang="ts">
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { EdicionDeSalida } from '../../composables/documentos/edicion-de-documento';

/**
 * El encabezado de una salida por consumo. El destino es siempre gasto: sale de la bodega y se carga al concepto de
 * gasto elegido (de ahí sale la cuenta contable); localidad y departamento son el centro de costo, opcionales.
 */
defineProps<{
  errores: Record<string, string>;
  opcionesDeBodegas: OpcionDeRegistro[];
  conceptos: OpcionDeRegistro[];
  localidades: OpcionDeRegistro[];
  departamentos: OpcionDeRegistro[];
  verLocalidades: boolean;
  verDepartamentos: boolean;
}>();
const edicion = defineModel<EdicionDeSalida>({ required: true });
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2">
    <CampoTexto v-model="edicion.fecha" etiqueta="Fecha" tipo="date" requerido :error="errores.fecha" />
    <CampoSelector
      v-model="edicion.bodegaId"
      etiqueta="Bodega de la que sale"
      :opciones="opcionesDeBodegas"
      requerido
      :error="errores.bodegaId"
    />
    <CampoSelector
      v-model="edicion.conceptoDeGastoId"
      etiqueta="Concepto de gasto"
      :opciones="conceptos"
      requerido
      :error="errores.conceptoDeGastoId"
    />
    <CampoTexto v-model="edicion.entregadoA" etiqueta="Entregado a" :error="errores.entregadoA" />
    <CampoSelector
      v-if="verLocalidades"
      v-model="edicion.localidadId"
      etiqueta="Localidad (centro de costo)"
      :opciones="localidades"
      :error="errores.localidadId"
    />
    <CampoSelector
      v-if="verDepartamentos"
      v-model="edicion.departamentoId"
      etiqueta="Departamento (centro de costo)"
      :opciones="departamentos"
      :error="errores.departamentoId"
    />
    <div class="sm:col-span-2">
      <CampoTexto v-model="edicion.observaciones" etiqueta="Observaciones" multilinea :error="errores.observaciones" />
    </div>
  </div>
</template>
