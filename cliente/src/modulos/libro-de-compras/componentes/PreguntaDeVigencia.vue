<script setup lang="ts">
import { computed, useId } from 'vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import { mesPropuesto, modoDeVigencia, opcionesDeMes, type ModoDeVigencia } from '../composables/vigencia-fiscal';
import { TEXTOS_DE_VIGENCIA as T } from '../textos';

/**
 * «¿Desde cuándo rigen estos datos?»: corregir lo de hoy, un cambio a partir de un mes, o desde el inicio. La
 * primera vez no se pregunta: los datos rigen desde el inicio.
 */
const props = defineProps<{ guardado: boolean; hayFacturasHoy: boolean; error?: string }>();
const modelo = defineModel<string | null | undefined>();
const grupo = useId();
const hoy = new Date();

const modo = computed(() => modoDeVigencia(modelo.value));
const meses = computed(() => opcionesDeMes(hoy, modelo.value));
const opciones: { modo: ModoDeVigencia; titulo: string; ayuda: string }[] = [
  { modo: 'actual', titulo: T.actual, ayuda: T.actualAyuda },
  { modo: 'mes', titulo: T.mes, ayuda: T.mesAyuda },
  { modo: 'inicio', titulo: T.inicio, ayuda: T.inicioAyuda },
];

function escoger(nuevo: ModoDeVigencia): void {
  if (nuevo === 'actual') modelo.value = undefined;
  else if (nuevo === 'inicio') modelo.value = null;
  else modelo.value = mesPropuesto(hoy, props.hayFacturasHoy);
}
</script>

<template>
  <div class="space-y-3">
    <p
      v-if="!guardado"
      class="rounded-lg bg-tierra-100 p-3 text-sm text-tierra-700 dark:bg-tierra-800 dark:text-tierra-200"
    >
      {{ T.primeraVez }}
    </p>
    <fieldset v-else class="space-y-2">
      <legend class="mb-1 text-sm font-medium text-tierra-800 dark:text-tierra-100">{{ T.pregunta }}</legend>
      <label
        v-for="opcion in opciones"
        :key="opcion.modo"
        class="flex cursor-pointer items-start gap-3 rounded-lg p-2 ring-1 ring-tierra-200 has-[:checked]:bg-campo-50 has-[:checked]:ring-campo-500 dark:ring-tierra-700 dark:has-[:checked]:bg-campo-950/40"
      >
        <input
          type="radio"
          :name="grupo"
          class="mt-1 size-4 shrink-0 accent-campo-700"
          :checked="modo === opcion.modo"
          @change="escoger(opcion.modo)"
        />
        <span class="min-w-0">
          <span class="block text-sm font-medium text-tierra-800 dark:text-tierra-100">{{ opcion.titulo }}</span>
          <span class="block text-xs text-tierra-500">{{ opcion.ayuda }}</span>
        </span>
      </label>
      <CampoSelector
        v-if="modo === 'mes' && modelo"
        v-model="modelo"
        :etiqueta="T.elMes"
        :opciones="meses"
        requerido
        :error="error"
      />
    </fieldset>
    <p v-if="error && (modo !== 'mes' || !guardado)" class="text-sm text-red-600 dark:text-red-400" role="alert">
      {{ error }}
    </p>
  </div>
</template>
