<script setup lang="ts">
import { computed } from 'vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { textoDeEdicion, opcionesDeLista } from '@/modulos/core/utilidades/edicion';
import { hoyEnIso, OPCIONES_DE_FUENTE, type EdicionDeMedicion } from '../../composables/mediciones/edicion-de-medicion';
import {
  OPCIONES_DE_UNIDAD,
  vistaPreviaDeSuperficie,
  type AjustesDeSuperficie,
} from '../../composables/superficie/unidades-de-superficie';
import CalculadoraDeSuperficie from './CalculadoraDeSuperficie.vue';

/**
 * Los campos de una medición con la calculadora de superficie: el operador escribe la cifra como la lee de su papel
 * (cuerdas, manzanas, caballerías…) y ve en vivo los m², las hectáreas y las manzanas que se van a guardar. Los usan
 * el formulario de la parcela y la ventana de la ficha, así se ven igual.
 */
const props = defineProps<{ errores: Record<string, string>; ajustes: AjustesDeSuperficie }>();
const edicion = defineModel<EdicionDeMedicion>({ required: true });

const hoy = hoyEnIso();
const entradaDe = (cifra: string | number) => ({
  cifra: textoDeEdicion(cifra),
  unidad: edicion.value.unidad,
  varasPorLadoDeCuerda: edicion.value.varasPorLadoDeCuerda,
});
const total = computed(() => vistaPreviaDeSuperficie(entradaDe(edicion.value.cifra), props.ajustes.factores));
const util = computed(() => vistaPreviaDeSuperficie(entradaDe(edicion.value.cifraUtil), props.ajustes.factores));
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <CampoTexto
        v-model="edicion.vigenteDesde"
        etiqueta="Vigente desde"
        tipo="date"
        :maximo="hoy"
        requerido
        :error="errores.vigenteDesde"
      />
      <CampoSelector
        v-model="edicion.fuente"
        etiqueta="De dónde sale la medida"
        :opciones="opcionesDeLista(OPCIONES_DE_FUENTE, false)"
        requerido
        :error="errores.fuente"
      />
    </div>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <CampoTexto
        v-model="edicion.cifra"
        etiqueta="Superficie total"
        tipo="number"
        paso="any"
        requerido
        ayuda="Escríbala en la unidad de su papel; no hace falta convertirla."
        :error="errores.cifra"
      />
      <CampoSelector
        v-model="edicion.unidad"
        etiqueta="Unidad"
        :opciones="opcionesDeLista(OPCIONES_DE_UNIDAD, false)"
        requerido
        :error="errores.unidad"
      />
    </div>
    <CampoTexto
      v-if="edicion.unidad === 'cuerda'"
      v-model="edicion.varasPorLadoDeCuerda"
      etiqueta="Varas por lado de la cuerda"
      tipo="number"
      requerido
      ayuda="En la mayor parte del país una cuerda mide 25 varas por lado; en otras regiones, 40."
      :error="errores.varasPorLadoDeCuerda"
    />
    <CampoTexto
      v-model="edicion.cifraUtil"
      etiqueta="Superficie útil (opcional)"
      tipo="number"
      paso="any"
      ayuda="En la misma unidad. Es la que se puede pastorear o sembrar. Si no la conoce, se toma igual a la total."
      :error="errores.cifraUtil"
    />
    <CalculadoraDeSuperficie :total="total" :util="util" />
    <CampoTexto
      v-model="edicion.documento"
      etiqueta="Documento o plano que la respalda (opcional)"
      :error="errores.documento"
    />
  </div>
</template>
