<script setup lang="ts">
import { computed } from 'vue';
import {
  posicionesRepetidas,
  unidadesSinSerie,
  type RenglonDeUnidad,
} from '../../composables/bandeja/cuadricula-de-unidades';

/**
 * Un renglón por unidad para escribir su código, su número de serie y su placa; todo es opcional: el código lo
 * propone el sistema si se deja vacío y lo demás se completa después en la ficha. `errores` trae los del servidor
 * por renglón (`renglon.<n>`).
 */
const props = defineProps<{ errores: Record<string, string> }>();
const renglones = defineModel<RenglonDeUnidad[]>({ required: true });
const repetidos = computed(() => posicionesRepetidas(renglones.value));
const sinSerie = computed(() => unidadesSinSerie(renglones.value));
const errorDe = (indice: number): string | undefined =>
  props.errores[`renglon.${indice}`] ??
  (repetidos.value.has(indice) ? 'Este código se repite en la cuadrícula. Cámbielo.' : undefined);

const CLASE_DEL_CAMPO =
  'w-full min-w-0 rounded-lg border-0 bg-white px-3 py-2 text-base ring-1 ring-tierra-200 placeholder:text-tierra-400 focus:ring-2 focus:ring-campo-500 aria-invalid:ring-red-500 sm:text-sm dark:bg-tierra-800 dark:ring-tierra-700';
</script>

<template>
  <fieldset class="space-y-2">
    <legend class="text-sm font-medium text-tierra-700 dark:text-tierra-200">
      Código, serie y placa de cada unidad
      <span class="font-normal text-tierra-500">(opcional)</span>
    </legend>
    <p class="text-xs text-tierra-500">
      Sin código, se propone el siguiente de cada una. Lo que no escriba lo completa después en la ficha;
      <template v-if="sinSerie">
        {{ sinSerie }} unidad{{ sinSerie === 1 ? '' : 'es' }} quedaría{{ sinSerie === 1 ? '' : 'n' }} «sin serie» en el
        reporte de existencias.
      </template>
      <template v-else>todas tienen serie.</template>
    </p>
    <ol class="max-h-80 space-y-2 overflow-y-auto pr-1">
      <li
        v-for="(renglon, indice) in renglones"
        :key="indice"
        class="grid grid-cols-[1.5rem_1fr] items-start gap-x-2 gap-y-1 sm:grid-cols-[1.5rem_1fr_1fr_1fr]"
      >
        <span class="pt-2 text-right text-xs text-tierra-500 tabular-nums">{{ indice + 1 }}</span>
        <input
          v-model="renglon.codigo"
          :class="CLASE_DEL_CAMPO"
          placeholder="Código (automático)"
          maxlength="30"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
          :aria-label="`Código de la unidad ${indice + 1}`"
          :aria-invalid="!!errorDe(indice)"
        />
        <input
          v-model="renglon.numeroDeSerie"
          :class="[CLASE_DEL_CAMPO, 'col-start-2 sm:col-start-auto']"
          placeholder="Número de serie"
          maxlength="80"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
          :aria-label="`Número de serie de la unidad ${indice + 1}`"
        />
        <input
          v-model="renglon.placa"
          :class="[CLASE_DEL_CAMPO, 'col-start-2 sm:col-start-auto']"
          placeholder="Placa"
          maxlength="80"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
          :aria-label="`Placa de la unidad ${indice + 1}`"
        />
        <p v-if="errorDe(indice)" class="col-start-2 text-sm text-red-700 sm:col-span-3 dark:text-red-400" role="alert">
          {{ errorDe(indice) }}
        </p>
      </li>
    </ol>
  </fieldset>
</template>
