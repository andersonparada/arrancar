<script setup lang="ts">
import { computed } from 'vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import { TEXTOS_FISCALES as T } from '../textos';

/**
 * Si lleva contabilidad completa (agente de retención del ISR). Cuando la tabla de regímenes propone un valor
 * es un interruptor; cuando no (p. ej. persona individual en el régimen opcional) es una pregunta que se contesta.
 */
const props = defineProps<{ hayQueContestar: boolean; error?: string }>();
const valor = defineModel<boolean | undefined>();

const OPCIONES = [
  { valor: 'no', texto: 'No' },
  { valor: 'si', texto: 'Sí' },
];
const respuesta = computed({
  get: () => (valor.value === undefined ? null : valor.value ? 'si' : 'no'),
  set: (nueva: string | null) => (valor.value = nueva === null ? undefined : nueva === 'si'),
});
</script>

<template>
  <div class="space-y-2">
    <template v-if="props.hayQueContestar">
      <CampoSelector
        v-model="respuesta"
        :etiqueta="T.preguntaContabilidad"
        :opciones="OPCIONES"
        requerido
        :error="error"
      />
      <p class="text-xs text-tierra-500">{{ T.preguntaContabilidadAyuda }}</p>
    </template>
    <template v-else>
      <CampoInterruptor v-model="valor" :etiqueta="T.agenteIsrEtiqueta" :descripcion="T.agenteIsrAyuda" />
      <p v-if="valor === false" class="text-sm text-amber-700 dark:text-amber-400" role="status">
        {{ T.agenteIsrAviso }}
      </p>
      <p v-if="error" class="text-sm text-red-600 dark:text-red-400" role="alert">{{ error }}</p>
    </template>
  </div>
</template>
