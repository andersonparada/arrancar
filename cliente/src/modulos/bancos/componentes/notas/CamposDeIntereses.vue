<script setup lang="ts">
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { EdicionDeNota } from '../../composables/notas/edicion-de-nota';

/**
 * Los datos que pide un concepto de intereses (H8): lo que dijo el banco. El ISR se propone al escribir el interés
 * bruto (10 % por omisión), pero se puede cambiar: el banco redondea a su manera.
 */
defineProps<{ errores: Record<string, string> }>();
const edicion = defineModel<EdicionDeNota>({ required: true });

const AYUDA_DEL_ISR =
  'Se propone con la tasa de ISR sobre intereses; cámbialo si tu banco retuvo otro monto (puede ser 0.00).';
</script>

<template>
  <fieldset class="space-y-4 rounded-lg bg-campo-50 p-3 dark:bg-campo-900/20">
    <legend class="px-1 text-sm font-medium text-tierra-700 dark:text-tierra-200">
      Intereses del estado de cuenta
    </legend>
    <CampoTexto
      v-model="edicion.interesBruto"
      etiqueta="Interés bruto"
      tipo="number"
      paso="any"
      requerido
      :error="errores.interesBruto"
    />
    <CampoTexto
      v-model="edicion.isrRetenido"
      etiqueta="ISR retenido"
      tipo="number"
      paso="any"
      requerido
      :ayuda="AYUDA_DEL_ISR"
      :error="errores.isrRetenido"
    />
  </fieldset>
</template>
