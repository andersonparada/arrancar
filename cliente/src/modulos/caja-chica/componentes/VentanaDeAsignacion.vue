<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { EdicionDeAsignacion, ResumenDeAsignacion } from '../composables/comprobantes/armado-de-asignacion';
import { AYUDA_DE_LA_FECHA, AYUDA_DE_LA_RETENCION, MAXIMO_DEL_MOTIVO } from '../textos';

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

const puedeSobreElTope = usarSesion().puede('caja-chica.comprobantes.sobre-el-tope');
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
      <div
        v-if="hayRetencion"
        class="flex gap-2 rounded-2xl bg-trigo-300/40 p-3 text-sm text-tierra-900 dark:bg-trigo-500/20 dark:text-trigo-300"
        role="note"
      >
        <TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          {{ resumen.conRetencion === 1 ? '1 factura lleva' : `${resumen.conRetencion} facturas llevan` }} retención por
          {{ formatearMonto(resumen.retenido) }}. {{ AYUDA_DE_LA_RETENCION }} Quedará registrado que usted lo autorizó.
        </span>
      </div>
      <CampoTexto
        v-if="hayRetencion"
        v-model="edicion.motivoConRetencion"
        etiqueta="Motivo para pagar del fondo las facturas con retención"
        requerido
        multilinea
        :longitud-maxima="MAXIMO_DEL_MOTIVO"
        :error="errores.motivoConRetencion"
      />
      <CampoTexto
        v-if="puedeSobreElTope"
        v-model="edicion.motivoSobreElTope"
        etiqueta="Motivo si algún documento pasa del tope del fondo"
        multilinea
        :longitud-maxima="MAXIMO_DEL_MOTIVO"
        ayuda="Solo hace falta si un documento pasa del tope; si no, se ignora."
        :error="errores.motivoSobreElTope"
      />
      <CampoTexto
        v-model="edicion.fecha"
        etiqueta="Fecha del gasto"
        tipo="date"
        :ayuda="`${AYUDA_DE_LA_FECHA} Vacía, cada documento entra con su fecha de emisión.`"
        :error="errores.fecha"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-de-asignacion" :cargando="enviando">Asignar al fondo</BotonBase>
    </template>
  </VentanaModal>
</template>
