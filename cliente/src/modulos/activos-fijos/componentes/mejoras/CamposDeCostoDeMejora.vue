<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { opcionesDeLista } from '@/modulos/core/utilidades/edicion';
import { OPCIONES_DE_CLASE_DE_COSTO_MANUAL } from '../../composables/costos/edicion-de-costo';
import type { RenglonDeMejora } from '../../composables/mejoras/edicion-de-mejora';

/** Un costo de la mejora; `indice` arma el nombre del error que manda el servidor (`costosManuales.<i>.<campo>`). */
const props = defineProps<{ indice: number; errores: Record<string, string>; puedeQuitar: boolean }>();
const emit = defineEmits<{ quitar: [] }>();
const renglon = defineModel<RenglonDeMejora>({ required: true });
const errorDe = (campo: string): string | undefined => props.errores[`costosManuales.${props.indice}.${campo}`];
</script>

<template>
  <fieldset class="space-y-3 rounded-xl border border-tierra-200 p-3 dark:border-tierra-700">
    <legend class="px-1 text-sm font-medium">Costo {{ indice + 1 }}</legend>
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <CampoSelector
        v-model="renglon.claseDeCosto"
        etiqueta="Clase de costo"
        :opciones="opcionesDeLista(OPCIONES_DE_CLASE_DE_COSTO_MANUAL, false)"
        requerido
        :error="errorDe('claseDeCosto')"
      />
      <CampoTexto
        v-model="renglon.monto"
        etiqueta="Monto"
        tipo="number"
        paso="0.01"
        requerido
        :error="errorDe('monto')"
      />
    </div>
    <CampoTexto
      v-model="renglon.documentoDeSoporte"
      etiqueta="Documento de soporte"
      requerido
      :longitud-maxima="150"
      ayuda="Por ejemplo: «Factura A-123 de Ferretería El Sol»."
      :error="errorDe('documentoDeSoporte')"
    />
    <CampoTexto v-model="renglon.descripcion" etiqueta="Descripción" :longitud-maxima="300" />
    <CampoInterruptor
      v-model="renglon.aplicaAlLibroFiscal"
      etiqueta="Entra al libro fiscal"
      descripcion="Apáguelo si no hay documento que lo respalde ante la SAT."
    />
    <CampoTexto
      v-if="!renglon.aplicaAlLibroFiscal"
      v-model="renglon.motivoFueraDelLibroFiscal"
      etiqueta="Por qué queda fuera del libro fiscal"
      multilinea
      requerido
      :longitud-maxima="300"
      :error="errorDe('motivoFueraDelLibroFiscal')"
    />
    <div v-if="puedeQuitar" class="flex justify-end">
      <BotonBase variante="fantasma" pequeno :icono="Trash2" @click="emit('quitar')">Quitar este costo</BotonBase>
    </div>
  </fieldset>
</template>
