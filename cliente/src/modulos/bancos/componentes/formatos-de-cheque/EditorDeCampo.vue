<script setup lang="ts">
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { EntradaDeCampo } from '../../composables/formatos-de-cheque/campos-del-formato';
import type { Alineacion } from '../../servicios/tipos-de-formatos-de-cheque';

/** Las medidas de un campo mientras se escriben: pueden ser texto hasta que se guarda. */
export interface CampoEditable {
  xMm: number | string;
  yMm: number | string;
  anchoMm: number | string;
  tamanoPt?: number | string;
  visible: boolean;
  alineacion?: Alineacion;
  preimpreso?: boolean;
}

/**
 * Un lugar del papel: cuánto se aleja del borde de arriba y de la izquierda, su ancho y su letra, en milímetros y puntos.
 * Los opcionales se pueden quitar del formato (`usar`) y las leyendas pueden venir ya impresas en el formulario.
 */
defineProps<{ entrada: EntradaDeCampo }>();
const emit = defineEmits<{ usar: [usar: boolean] }>();
const campo = defineModel<CampoEditable | null>({ required: true });

const ALINEACIONES = [
  { valor: 'izquierda' as Alineacion, texto: 'A la izquierda' },
  { valor: 'centro' as Alineacion, texto: 'Centrado' },
  { valor: 'derecha' as Alineacion, texto: 'A la derecha' },
];
</script>

<template>
  <fieldset class="rounded-xl p-3 ring-1 ring-tierra-200 dark:ring-tierra-700">
    <legend class="px-1 text-sm font-semibold">{{ entrada.etiqueta }}</legend>
    <CampoInterruptor
      v-if="entrada.opcional"
      :model-value="campo !== null"
      etiqueta="Usar este campo"
      @update:model-value="emit('usar', $event)"
    />
    <div v-if="campo" class="mt-2 space-y-3">
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CampoTexto v-model="campo.xMm" etiqueta="Desde la izquierda (mm)" tipo="number" paso="any" requerido />
        <CampoTexto v-model="campo.yMm" etiqueta="Desde arriba (mm)" tipo="number" paso="any" requerido />
        <CampoTexto v-model="campo.anchoMm" etiqueta="Ancho (mm)" tipo="number" paso="any" requerido />
        <CampoTexto
          v-model="campo.tamanoPt"
          etiqueta="Letra (pt)"
          tipo="number"
          paso="any"
          ayuda="Vacío: la del formato."
        />
      </div>
      <CampoSelector
        v-if="entrada.conAlineacion"
        v-model="campo.alineacion"
        etiqueta="Alineación del texto"
        :opciones="ALINEACIONES"
      />
      <CampoInterruptor v-model="campo.visible" etiqueta="Se imprime" />
      <CampoInterruptor
        v-if="entrada.conPreimpreso"
        v-model="campo.preimpreso"
        etiqueta="Ya viene impreso en el formulario"
        descripcion="El sistema no la vuelve a imprimir; si el cheque se emitió sin esa condición, se avisa antes de imprimir."
      />
    </div>
  </fieldset>
</template>
