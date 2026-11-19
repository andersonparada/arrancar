<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { EdicionDeAsignacion, ResumenDeAsignacion } from '../composables/comprobantes/armado-de-asignacion';
import CamposDeExcepciones from './CamposDeExcepciones.vue';

/**
 * Confirmar la asignación de documentos a un fondo: resume lo que va a pasar y pide, solo si hace falta, el motivo de la
 * excepción de retención. El motivo del tope se ofrece a quien tiene el permiso; solo cuenta en los documentos que lo pasan.
 */
defineProps<{
  abierta: boolean;
  enviando: boolean;
  errores: Record<string, string>;
  fondo: string;
  resumen: ResumenDeAsignacion;
  hayRetencion: boolean;
}>();
const edicion = defineModel<EdicionDeAsignacion>({ required: true });
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
</script>

<template>
  <VentanaModal :abierta="abierta" :titulo="`Asignar a «${fondo}»`" @cerrar="emit('cerrar')">
    <form id="form-de-asignacion" class="space-y-4" novalidate @submit.prevent="emit('guardar')">
      <p class="text-sm" aria-live="polite">
        Va a asignar
        <strong>{{ resumen.cantidad === 1 ? '1 documento' : `${resumen.cantidad} documentos` }}</strong>
        al fondo «{{ fondo }}». Del fondo saldrán <strong>{{ formatearMonto(resumen.total) }}</strong
        >, y quedan pendientes de reponer.
        <template v-if="resumen.notasDeCredito > 0">
          Incluye {{ resumen.notasDeCredito }}
          {{ resumen.notasDeCredito === 1 ? 'nota de crédito, que resta' : 'notas de crédito, que restan' }}.
        </template>
      </p>
      <CamposDeExcepciones
        v-model="edicion"
        :errores="errores"
        :hay-retencion="hayRetencion"
        :con-retencion="resumen.conRetencion"
        :retenido="resumen.retenido"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-de-asignacion" :cargando="enviando">Asignar al fondo</BotonBase>
    </template>
  </VentanaModal>
</template>
