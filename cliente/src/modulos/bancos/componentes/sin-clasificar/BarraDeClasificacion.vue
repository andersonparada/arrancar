<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { ResumenDeSeleccion } from '../../composables/movimientos/seleccion-de-pendientes';

/**
 * La barra fija de abajo: cuánto hay marcado, con qué concepto clasificarlo y el botón. Solo ofrece los conceptos que
 * sirven a todo lo marcado (si hay créditos y débitos juntos, únicamente los que valen para ambos).
 */
defineProps<{ resumen: ResumenDeSeleccion; opciones: OpcionDeRegistro[]; puedeClasificar: boolean }>();
const concepto = defineModel<string | null>('concepto', { required: true });
const emit = defineEmits<{ clasificar: [] }>();
</script>

<template>
  <div
    v-permiso="'bancos.notas.editar'"
    class="sticky bottom-0 z-10 -mx-4 mt-4 border-t border-tierra-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-5 dark:border-tierra-700 dark:bg-tierra-900/95"
  >
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
      <p class="text-sm sm:flex-1" aria-live="polite">
        <template v-if="resumen.cantidad">
          <strong>{{ resumen.cantidad }}</strong> {{ resumen.cantidad === 1 ? 'marcado' : 'marcados' }}:
          {{ formatearMonto(resumen.montoDeEntradas) }} de entradas y {{ formatearMonto(resumen.montoDeSalidas) }} de
          salidas.
        </template>
        <template v-else>Marque los movimientos que quiere clasificar.</template>
      </p>
      <div class="sm:w-72">
        <CampoSelector v-model="concepto" etiqueta="Clasificar como…" :opciones="opciones" />
      </div>
      <BotonBase :deshabilitado="!puedeClasificar" @click="emit('clasificar')">Clasificar</BotonBase>
    </div>
  </div>
</template>
