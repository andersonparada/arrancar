<script setup lang="ts">
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { opcionesDeLista } from '@/modulos/core/utilidades/edicion';
import { OPCIONES_DE_TIPO_DE_INVENTARIO } from '../../composables/articulos/edicion-de-articulo';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { EdicionDeArticulo } from '../../composables/articulos/edicion-de-articulo';

/** Los campos del artículo; los usan la ventana y el formulario en página, así se ven igual. */
defineProps<{
  errores: Record<string, string>;
  referencias: Record<'categoriaId' | 'unidadBaseId' | 'conceptoDeGastoId', OpcionDeRegistro[]>;
}>();
const edicion = defineModel<EdicionDeArticulo>({ required: true });
</script>

<template>
  <div class="space-y-4">
    <CampoTexto
      v-model="edicion.codigo"
      etiqueta="Código"
      requerido
      sin-correccion
      ayuda="Se propone con el prefijo de la empresa; puede cambiarlo. Letras, números, punto, guion y diagonal."
      :error="errores.codigo"
    />
    <CampoTexto v-model="edicion.nombre" etiqueta="Nombre" requerido :error="errores.nombre" />
    <CampoTexto v-model="edicion.descripcion" etiqueta="Descripción" multilinea :error="errores.descripcion" />
    <CampoSelector
      v-model="edicion.categoriaId"
      etiqueta="Categoría"
      :opciones="referencias.categoriaId"
      requerido
      :error="errores.categoriaId"
    />
    <CampoSelector
      v-model="edicion.tipoDeInventario"
      etiqueta="Tipo de inventario"
      :opciones="opcionesDeLista(OPCIONES_DE_TIPO_DE_INVENTARIO, false)"
      requerido
      :error="errores.tipoDeInventario"
    />
    <CampoSelector
      v-model="edicion.unidadBaseId"
      etiqueta="Unidad base"
      :opciones="referencias.unidadBaseId"
      requerido
      :error="errores.unidadBaseId"
    />
    <CampoInterruptor v-model="edicion.manejaLotes" etiqueta="Maneja lotes" />
    <CampoInterruptor v-model="edicion.manejaVencimiento" etiqueta="Maneja vencimiento" />
    <CampoTexto
      v-model="edicion.codigoDeBarras"
      etiqueta="Código de barras"
      sin-correccion
      :error="errores.codigoDeBarras"
    />
    <CampoSelector
      v-model="edicion.conceptoDeGastoId"
      etiqueta="Concepto de gasto"
      :opciones="referencias.conceptoDeGastoId"
      :error="errores.conceptoDeGastoId"
    />
    <CampoTexto
      v-model="edicion.existenciaMinima"
      etiqueta="Existencia mínima"
      tipo="number"
      paso="any"
      :error="errores.existenciaMinima"
    />
    <CampoTexto
      v-model="edicion.pesoKgPorUnidadBase"
      etiqueta="Peso en kg por unidad base"
      tipo="number"
      paso="any"
      :error="errores.pesoKgPorUnidadBase"
    />
    <CampoInterruptor v-model="edicion.activo" etiqueta="Activo" />
  </div>
</template>
