<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import { documentoDeFila } from '../../composables/movimientos/fila-del-reporte';
import { textoDeReclasificacion } from '../../composables/movimientos/reclasificacion-de-fila';
import type { FilaDelReporte } from '../../servicios/movimientos.api';

/**
 * Cambiar el concepto de un movimiento ya registrado: muestra cuál es (documento, fecha, monto y concepto actual),
 * pide el concepto nuevo y explica qué cambia antes de confirmar.
 */
defineProps<{
  fila: FilaDelReporte | null;
  opciones: OpcionDeRegistro[];
  nombreElegido: string | null;
  errores: Record<string, string>;
  enviando: boolean;
}>();
const emit = defineEmits<{ cerrar: []; confirmar: [] }>();
const concepto = defineModel<string | null>('concepto', { required: true });
</script>

<template>
  <VentanaModal :abierta="!!fila" titulo="Reclasificar movimiento" @cerrar="emit('cerrar')">
    <form v-if="fila" id="form-reclasificar" class="space-y-4" @submit.prevent="emit('confirmar')">
      <p class="rounded-lg bg-tierra-50 px-3 py-2 text-sm dark:bg-tierra-900/50">
        <strong>{{ documentoDeFila(fila).titulo }}</strong> del {{ formatearFecha(fila.fecha) }} por
        {{ formatearMonto(fila.monto) }}
        <span class="block text-xs text-tierra-600 dark:text-tierra-300"
          >Concepto actual: {{ fila.conceptoNombre }}</span
        >
      </p>
      <CampoSelector
        v-model="concepto"
        etiqueta="Concepto nuevo"
        :opciones="opciones"
        requerido
        :error="errores.conceptoId"
      />
      <p class="text-sm text-tierra-600 dark:text-tierra-300" aria-live="polite">
        {{ textoDeReclasificacion(fila.conceptoNombre, nombreElegido) }}
      </p>
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-reclasificar" :deshabilitado="!concepto" :cargando="enviando">
        Reclasificar
      </BotonBase>
    </template>
  </VentanaModal>
</template>
