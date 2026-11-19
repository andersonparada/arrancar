<script setup lang="ts">
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { opcionesDeLista } from '@/modulos/core/utilidades/edicion';
import {
  OPCIONES_DE_SITUACION_REGISTRAL,
  OPCIONES_DE_REGISTRO,
  OPCIONES_DE_TITULARIDAD,
  OPCIONES_DE_ADMINISTRA_IUSI,
  OPCIONES_DE_UNIDAD_ORIGINAL,
} from '../../composables/inmuebles/edicion-de-inmueble';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { EdicionDeInmueble } from '../../composables/inmuebles/edicion-de-inmueble';

/** Los campos del inmueble; los usan el formulario de alta y el de edición, así se ven igual. */
defineProps<{
  errores: Record<string, string>;
  referencias: Record<
    'localidadId' | 'departamentoRegistral' | 'departamentoCodigo' | 'municipioCodigo',
    OpcionDeRegistro[]
  >;
}>();
const edicion = defineModel<EdicionDeInmueble>({ required: true });
</script>

<template>
  <div class="space-y-4">
    <CampoTexto v-model="edicion.nombre" etiqueta="Nombre" requerido :error="errores.nombre" />
    <CampoSelector
      v-model="edicion.situacionRegistral"
      etiqueta="Situación registral"
      :opciones="opcionesDeLista(OPCIONES_DE_SITUACION_REGISTRAL, false)"
      requerido
      :error="errores.situacionRegistral"
    />

    <template v-if="edicion.situacionRegistral === 'inscrito'">
      <CampoSelector
        v-model="edicion.registro"
        etiqueta="Registro"
        :opciones="opcionesDeLista(OPCIONES_DE_REGISTRO, true)"
        requerido
        :error="errores.registro"
      />
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CampoTexto
          v-model="edicion.numeroDeFinca"
          etiqueta="Número de finca"
          requerido
          :error="errores.numeroDeFinca"
        />
        <CampoTexto v-model="edicion.folio" etiqueta="Folio" requerido :error="errores.folio" />
        <CampoTexto v-model="edicion.libro" etiqueta="Libro" requerido :error="errores.libro" />
      </div>
      <CampoSelector
        v-model="edicion.departamentoRegistral"
        etiqueta="Departamento del libro"
        :opciones="referencias.departamentoRegistral"
        requerido
        :error="errores.departamentoRegistral"
      />
    </template>
    <template v-else>
      <CampoTexto
        v-model="edicion.documentoPosesorio"
        etiqueta="Documento de derechos posesorios"
        requerido
        :error="errores.documentoPosesorio"
      />
      <CampoInterruptor v-model="edicion.titulacionSupletoriaEnTramite" etiqueta="Titulación supletoria en trámite" />
    </template>

    <CampoSelector
      v-model="edicion.titularidad"
      etiqueta="Titularidad"
      :opciones="opcionesDeLista(OPCIONES_DE_TITULARIDAD, false)"
      requerido
      :error="errores.titularidad"
    />
    <CampoTexto
      v-if="edicion.titularidad === 'copropiedad'"
      v-model="edicion.porcentajeDeCopropiedad"
      etiqueta="Porcentaje de copropiedad"
      tipo="number"
      paso="any"
      requerido
      :error="errores.porcentajeDeCopropiedad"
    />
    <CampoTexto v-model="edicion.titular" etiqueta="Titular registral" :error="errores.titular" />

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <CampoTexto v-model="edicion.matriculaFiscal" etiqueta="Matrícula fiscal" :error="errores.matriculaFiscal" />
      <CampoSelector
        v-model="edicion.administraIusi"
        etiqueta="Quién administra el IUSI"
        :opciones="opcionesDeLista(OPCIONES_DE_ADMINISTRA_IUSI, true)"
        :error="errores.administraIusi"
      />
      <CampoTexto v-model="edicion.codigoCatastral" etiqueta="Código catastral" :error="errores.codigoCatastral" />
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <CampoTexto
        v-model="edicion.superficieRegistralM2"
        etiqueta="Superficie registral (m²)"
        tipo="number"
        paso="any"
        :error="errores.superficieRegistralM2"
      />
      <CampoTexto
        v-model="edicion.cantidadOriginal"
        etiqueta="Cantidad de la escritura"
        tipo="number"
        paso="any"
        :error="errores.cantidadOriginal"
      />
      <CampoSelector
        v-model="edicion.unidadOriginal"
        etiqueta="Unidad de la escritura"
        :opciones="opcionesDeLista(OPCIONES_DE_UNIDAD_ORIGINAL, true)"
        :error="errores.unidadOriginal"
      />
    </div>
    <CampoTexto
      v-if="edicion.unidadOriginal === 'cuerda'"
      v-model="edicion.varasPorLadoDeCuerda"
      etiqueta="Varas por lado de la cuerda"
      tipo="number"
      requerido
      :error="errores.varasPorLadoDeCuerda"
    />

    <CampoSelector
      v-model="edicion.localidadId"
      etiqueta="Localidad (si es de una sola)"
      :opciones="referencias.localidadId"
      :error="errores.localidadId"
    />
    <CampoTexto v-model="edicion.observaciones" etiqueta="Observaciones" multilinea :error="errores.observaciones" />
  </div>
</template>
