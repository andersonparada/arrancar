<script setup lang="ts">
import { nextTick, ref } from 'vue';
import { Plus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import {
  erroresDeLaLinea,
  erroresLocalesDeLinea,
  lineaVacia,
  sumaDeLineas,
  type LineaEnEdicion,
} from '../../composables/documentos/lineas-del-documento';
import type { ConceptoDeIngreso } from '../../servicios/conceptos-de-ingreso.api';
import FilaDeLinea from './FilaDeLinea.vue';

/** Las líneas del documento: agregar, quitar y editar cada una. */
const props = defineProps<{
  conceptos: ConceptoDeIngreso[];
  errores: Record<string, string>;
  intentado: boolean;
  conceptosNoDisponibles: boolean;
}>();
const lineas = defineModel<LineaEnEdicion[]>({ required: true });

const quitar = (clave: number) => (lineas.value = lineas.value.filter((linea) => linea.clave !== clave));
const raiz = ref<HTMLElement | null>(null);
const erroresDe = (linea: LineaEnEdicion, indice: number) => ({
  ...erroresLocalesDeLinea(linea, props.intentado),
  ...erroresDeLaLinea(props.errores, indice),
});

/** La línea nueva queda lista para escribir: el foco va a su primer campo. */
async function agregar(): Promise<void> {
  lineas.value.push(lineaVacia());
  await nextTick();
  raiz.value?.querySelector<HTMLElement>('fieldset:last-of-type button[role=combobox]')?.focus();
}
</script>

<template>
  <div ref="raiz" class="space-y-3">
    <p v-if="conceptosNoDisponibles" class="text-sm text-red-700 dark:text-red-300" role="alert">
      No se pudieron leer los conceptos de ingreso. Pida a un administrador el permiso para verlos o cree primero los
      conceptos en Administración.
    </p>
    <FilaDeLinea
      v-for="(linea, indice) in lineas"
      :key="linea.clave"
      :model-value="linea"
      :numero="indice + 1"
      :conceptos="conceptos"
      :errores="erroresDe(linea, indice)"
      :puede-quitar="lineas.length > 1"
      @update:model-value="lineas[indice] = $event"
      @quitar="quitar(linea.clave)"
    />
    <div class="flex flex-wrap items-center justify-between gap-3">
      <BotonBase variante="secundario" :icono="Plus" @click="agregar">Agregar línea</BotonBase>
      <p class="text-sm text-tierra-600 dark:text-tierra-300">
        Total del documento:
        <span class="font-semibold tabular-nums">{{ formatearMonto(sumaDeLineas(lineas)) }}</span>
      </p>
    </div>
  </div>
</template>
