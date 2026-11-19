<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { EdicionDeAsignacion } from '../composables/comprobantes/armado-de-asignacion';
import { AYUDA_DE_LA_FECHA, AYUDA_DE_LA_RETENCION, MAXIMO_DEL_MOTIVO } from '../textos';

/**
 * Lo que se escribe al meter documentos de la bandeja a un fondo: el motivo de la excepción de retención (solo si hay
 * facturas con retención), el del tope (a quien tiene el permiso; solo cuenta en los documentos que lo pasan) y la fecha.
 */
defineProps<{
  errores: Record<string, string>;
  hayRetencion: boolean;
  /** Cuántas facturas llevan retención y cuánto suman; solo se ven con `hayRetencion`. */
  conRetencion: number;
  retenido: string;
}>();
const edicion = defineModel<EdicionDeAsignacion>({ required: true });

const puedeSobreElTope = usarSesion().puede('caja-chica.comprobantes.sobre-el-tope');
</script>

<template>
  <div class="space-y-4">
    <div
      v-if="hayRetencion"
      class="flex gap-2 rounded-2xl bg-trigo-300/40 p-3 text-sm text-tierra-900 dark:bg-trigo-500/20 dark:text-trigo-300"
      role="note"
    >
      <TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        {{ conRetencion === 1 ? '1 factura lleva' : `${conRetencion} facturas llevan` }} retención por
        {{ formatearMonto(retenido) }}. {{ AYUDA_DE_LA_RETENCION }} Quedará registrado que usted lo autorizó.
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
  </div>
</template>
