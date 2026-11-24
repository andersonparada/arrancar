<script setup lang="ts">
import { Plus, Trash2 } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import { ligaNueva, type LigaEnEdicion } from '../../composables/parcelas/edicion-de-parcela';

/**
 * Los inmuebles que abarca la parcela: una fila por inmueble, con los m² de esa finca que abarca (opcional). Una fila
 * sin inmueble elegido no se manda.
 */
const props = defineProps<{ opciones: OpcionDeRegistro[]; error?: string; errores?: Record<string, string> }>();
/** El error del servidor de un campo de una fila: llega como `inmuebles.<fila>.<campo>`. */
const errorDe = (indice: number, campo: string): string | undefined => props.errores?.[`inmuebles.${indice}.${campo}`];
const ligas = defineModel<LigaEnEdicion[]>({ required: true });
const quitar = (indice: number): void => {
  ligas.value = ligas.value.filter((_liga, posicion) => posicion !== indice);
};
</script>

<template>
  <fieldset class="space-y-3">
    <legend class="text-sm font-medium text-tierra-700 dark:text-tierra-200">Inmuebles que abarca (opcional)</legend>
    <p class="text-xs text-tierra-500">
      La finca registral sobre la que está la parcela. Si abarca varias, agregue una fila por cada una.
    </p>
    <div
      v-for="(liga, indice) in ligas"
      :key="indice"
      class="grid grid-cols-1 gap-3 rounded-xl p-3 ring-1 ring-tierra-200 sm:grid-cols-[1fr_10rem_auto] sm:items-end dark:ring-tierra-700"
    >
      <CampoSelector
        v-model="liga.inmuebleId"
        :etiqueta="`Inmueble ${indice + 1}`"
        :opciones="opciones"
        :error="errorDe(indice, 'inmuebleId')"
      />
      <CampoTexto
        v-model="liga.superficieM2"
        etiqueta="Porción (m²)"
        tipo="number"
        paso="0.01"
        :error="errorDe(indice, 'superficieM2')"
      />
      <BotonBase
        variante="fantasma"
        :icono="Trash2"
        :aria-label="`Quitar el inmueble ${indice + 1}`"
        @click="quitar(indice)"
      >
        Quitar
      </BotonBase>
    </div>
    <p v-if="error" class="text-sm text-red-700 dark:text-red-400" role="alert">{{ error }}</p>
    <BotonBase variante="secundario" :icono="Plus" @click="ligas.push(ligaNueva())">Agregar inmueble</BotonBase>
  </fieldset>
</template>
