<script setup lang="ts">
import { nextTick, ref } from 'vue';
import { Plus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { ErroresDeLineas } from '../../composables/documentos/errores-del-registro';
import {
  erroresLocalesDeLinea,
  lineaVacia,
  sumaDeLineas,
  type LineaEnEdicion,
} from '../../composables/documentos/lineas-del-documento';
import type { Combustible } from '../../servicios/combustibles.api';
import type { ConceptoDeGasto } from '../../servicios/conceptos-de-gasto.api';
import { esFacturaEspecial } from '../../composables/documentos/tipos-de-documento-sat';
import FilaDeLinea from './FilaDeLinea.vue';

/** Las líneas del documento: agregar, quitar y editar cada una. */
const props = defineProps<{
  conceptos: ConceptoDeGasto[];
  combustibles: Combustible[];
  errores: ErroresDeLineas;
  tipoDte: string;
}>();
const lineas = defineModel<LineaEnEdicion[]>({ required: true });

const quitar = (clave: number) => (lineas.value = lineas.value.filter((linea) => linea.clave !== clave));
const raiz = ref<HTMLElement | null>(null);

/** La línea nueva queda lista para escribir: el foco va a su primer campo. */
async function agregar(): Promise<void> {
  lineas.value.push(lineaVacia());
  await nextTick();
  raiz.value?.querySelector<HTMLElement>('fieldset:last-of-type button[role=combobox]')?.focus();
}
</script>

<template>
  <div ref="raiz" class="space-y-3">
    <FilaDeLinea
      v-for="(linea, indice) in lineas"
      :key="linea.clave"
      :model-value="linea"
      :numero="indice + 1"
      :conceptos="conceptos"
      :combustibles="combustibles"
      :errores="{ ...erroresLocalesDeLinea(linea), ...errores[linea.clave] }"
      :con-montos-extra="!esFacturaEspecial(props.tipoDte)"
      :puede-quitar="lineas.length > 1"
      @quitar="quitar(linea.clave)"
    />
    <div class="flex flex-wrap items-center justify-between gap-3">
      <BotonBase variante="secundario" :icono="Plus" @click="agregar">Agregar línea</BotonBase>
      <p v-if="lineas.length > 1" class="text-sm text-tierra-600 dark:text-tierra-300">
        Suma de las líneas: <span class="font-semibold tabular-nums">{{ formatearMonto(sumaDeLineas(lineas)) }}</span>
      </p>
    </div>
  </div>
</template>
