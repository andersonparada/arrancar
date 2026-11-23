<script setup lang="ts">
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { opcionesDeLista } from '@/modulos/core/utilidades/edicion';
import {
  AYUDA_DE_LA_CATEGORIA_DE_IUSI,
  OPCIONES_DE_CATEGORIA_DE_IUSI,
  OPCIONES_DE_ORIGEN,
  type EdicionDeValor,
} from '../../composables/inmuebles/valores/edicion-de-valor';

/** Los campos de un valor del inmueble. La categoría del IUSI solo va con la matrícula fiscal. */
defineProps<{ errores: Record<string, string> }>();
const edicion = defineModel<EdicionDeValor>({ required: true });
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <CampoTexto
        v-model="edicion.vigenteDesde"
        etiqueta="Vigente desde"
        tipo="date"
        requerido
        ayuda="La fecha del avalúo o de la declaración."
        :error="errores.vigenteDesde"
      />
      <CampoSelector
        v-model="edicion.origen"
        etiqueta="Origen"
        :opciones="opcionesDeLista(OPCIONES_DE_ORIGEN, false)"
        requerido
        :error="errores.origen"
      />
    </div>
    <CampoTexto
      v-model="edicion.valorTotal"
      etiqueta="Valor total"
      tipo="number"
      paso="any"
      requerido
      :error="errores.valorTotal"
    />
    <p class="text-xs text-tierra-500">
      Si separa el terreno, las construcciones y los cultivos permanentes, escriba las tres partes y deben sumar el
      valor total; si escribe solo algunas, no pueden pasar del total.
    </p>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <CampoTexto
        v-model="edicion.valorTerreno"
        etiqueta="Terreno"
        tipo="number"
        paso="any"
        :error="errores.valorTerreno"
      />
      <CampoTexto
        v-model="edicion.valorConstrucciones"
        etiqueta="Construcciones"
        tipo="number"
        paso="any"
        :error="errores.valorConstrucciones"
      />
      <CampoTexto
        v-model="edicion.valorCultivosPermanentes"
        etiqueta="Cultivos permanentes"
        tipo="number"
        paso="any"
        :error="errores.valorCultivosPermanentes"
      />
    </div>
    <template v-if="edicion.fuente === 'matricula_fiscal'">
      <CampoSelector
        v-model="edicion.categoriaIusi"
        etiqueta="Categoría del IUSI"
        :opciones="opcionesDeLista(OPCIONES_DE_CATEGORIA_DE_IUSI, true)"
        :error="errores.categoriaIusi"
      />
      <p class="text-xs text-tierra-500">{{ AYUDA_DE_LA_CATEGORIA_DE_IUSI }}</p>
    </template>
    <CampoTexto
      v-model="edicion.documento"
      etiqueta="Documento"
      :longitud-maxima="150"
      ayuda="Número de avalúo o de recibo."
      :error="errores.documento"
    />
  </div>
</template>
