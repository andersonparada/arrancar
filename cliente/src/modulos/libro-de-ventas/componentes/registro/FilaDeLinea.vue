<script setup lang="ts">
import { computed } from 'vue';
import { Trash2 } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { opcionesDeLista } from '@/modulos/core/utilidades/edicion';
import type { LineaEnEdicion } from '../../composables/documentos/lineas-del-documento';
import type { ConceptoDeIngreso } from '../../servicios/conceptos-de-ingreso.api';
import { CLASES_FISCALES, FORMULARIO_DE_DOCUMENTO as textos, TIPOS_DE_LINEA } from '../../textos-de-documentos';

/** Una línea del documento: concepto, total con IVA y clase fiscal; el resto, en «Más de la línea». */
const props = defineProps<{
  numero: number;
  conceptos: ConceptoDeIngreso[];
  errores: Record<string, string>;
  puedeQuitar: boolean;
}>();
const linea = defineModel<LineaEnEdicion>({ required: true });
defineEmits<{ quitar: [] }>();

const opcionesDeConcepto = computed(() => [
  { valor: null, texto: 'Escoja el concepto' },
  ...props.conceptos.map(({ id, nombre }) => ({ valor: id, texto: nombre })),
]);
const clases = opcionesDeLista(CLASES_FISCALES, false);
const tipos = [{ valor: '', texto: 'Según el concepto' }, ...opcionesDeLista(TIPOS_DE_LINEA, false)];
</script>

<template>
  <fieldset class="min-w-0 space-y-3 rounded-lg border border-tierra-200 p-3 dark:border-tierra-700">
    <legend class="px-1 text-sm font-medium text-tierra-700 dark:text-tierra-200">Línea {{ numero }}</legend>
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_12rem]">
      <CampoSelector
        v-model="linea.conceptoDeIngresoId"
        etiqueta="Concepto"
        requerido
        :opciones="opcionesDeConcepto"
        :error="errores.conceptoDeIngresoId"
      />
      <CampoTexto
        v-model="linea.total"
        etiqueta="Total con IVA"
        requerido
        sin-correccion
        placeholder="0.00"
        :error="errores.total"
      />
      <CampoSelector
        v-model="linea.claseFiscal"
        etiqueta="Clase fiscal"
        :opciones="clases"
        :error="errores.claseFiscal"
      />
    </div>
    <details :open="!!(errores.otrosImpuestos || errores.tipo || errores.descripcion)">
      <summary class="cursor-pointer text-sm text-tierra-600 dark:text-tierra-300">Más de la línea</summary>
      <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <CampoTexto
          v-model="linea.descripcion"
          etiqueta="Descripción"
          :longitud-maxima="300"
          :error="errores.descripcion"
        />
        <CampoSelector v-model="linea.tipo" etiqueta="Bien o servicio" :opciones="tipos" :error="errores.tipo" />
        <CampoTexto
          v-model="linea.otrosImpuestos"
          etiqueta="Otros impuestos"
          sin-correccion
          :error="errores.otrosImpuestos"
        />
      </div>
    </details>
    <div class="flex items-center justify-between gap-2">
      <p class="text-xs text-tierra-500">{{ textos.ayudaDelTotal }}</p>
      <BotonBase v-if="puedeQuitar" variante="fantasma" pequeno :icono="Trash2" @click="$emit('quitar')">
        Quitar
      </BotonBase>
    </div>
  </fieldset>
</template>
