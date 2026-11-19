<script setup lang="ts">
import { RouterLink } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { totalDeLoMarcado } from '../composables/bandeja/bandeja';
import type { EdicionDeLaVentanaDeAsignacion } from '../composables/bandeja/usar-asignacion-de-la-bandeja';
import { MAXIMO_DEL_MOTIVO_DEL_CAMBIO } from '../composables/usar-cambio-con-motivo';
import type { GastoDeBandeja } from '../servicios/tipos-de-gastos';

/** Asignar lo marcado a un anticipo abierto; si hay documentos con retención, pide el motivo de la excepción. */
defineProps<{
  seleccion: GastoDeBandeja[];
  anticipos: OpcionBuscable<string>[];
  conRetencion: boolean;
  errores: Record<string, string>;
  enviando: boolean;
}>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeLaVentanaDeAsignacion>({ required: true });
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" titulo="Asignar a un anticipo" @cerrar="emit('cerrar')">
    <form id="form-asignacion" class="space-y-4" novalidate @submit.prevent="emit('guardar')">
      <p class="text-sm" role="status">
        {{ seleccion.length === 1 ? '1 documento marcado' : `${seleccion.length} documentos marcados` }} por
        {{ formatearMonto(totalDeLoMarcado(seleccion)) }}.
      </p>
      <CampoSelector
        v-model="edicion.anticipoId"
        etiqueta="Anticipo"
        requerido
        :opciones="anticipos"
        :error="errores.anticipoId"
      />
      <p v-if="anticipos.length === 0" class="text-sm text-tierra-600 dark:text-tierra-300">
        No hay anticipos abiertos. Entregue uno en
        <RouterLink to="/cuentas-por-liquidar/anticipos" class="font-medium underline underline-offset-2"
          >Anticipos</RouterLink
        >.
      </p>
      <CampoTexto
        v-if="conRetencion"
        v-model="edicion.motivoConRetencion"
        etiqueta="Por qué se paga del anticipo un documento con retención"
        requerido
        multilinea
        :longitud-maxima="MAXIMO_DEL_MOTIVO_DEL_CAMBIO"
        ayuda="Es una excepción: queda en la auditoría con su nombre."
        :error="errores.motivoConRetencion"
      />
      <CampoTexto
        v-model="edicion.fecha"
        etiqueta="Fecha del gasto"
        tipo="date"
        ayuda="Opcional. Déjela en blanco para usar la del documento; escríbala si el documento es de antes de la entrega del anticipo."
        :error="errores.fecha"
      />
      <p v-if="errores.documentos" class="text-sm text-red-700 dark:text-red-300" role="alert">
        {{ errores.documentos }}
      </p>
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-asignacion" :cargando="enviando">Asignar</BotonBase>
    </template>
  </VentanaModal>
</template>
