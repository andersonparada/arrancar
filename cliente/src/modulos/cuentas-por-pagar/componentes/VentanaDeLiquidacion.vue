<script setup lang="ts">
import { computed } from 'vue';
import { TriangleAlert } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { textoDeCentavos } from '../composables/dinero';
import {
  AVISO_DEL_CUSTODIO,
  MAXIMO_DEL_MOTIVO_DE_FALTANTE,
  type EdicionDeLiquidacion,
} from '../composables/retiros/liquidacion';
import { MAXIMO_DE_REFERENCIA_DEL_RETIRO } from '../composables/retiros/edicion-de-retiro';

/**
 * Liquidar un retiro: lo que sobró se reparte entre lo que se devuelve al banco (depósito) y lo que falta (con su motivo).
 * Al escribir uno, el otro se completa solo para que siempre cuadre.
 */
const props = defineProps<{
  cuentas: OpcionBuscable<string>[];
  errores: Record<string, string>;
  enviando: boolean;
  hoy: string;
}>();
const emit = defineEmits<{ cerrar: []; guardar: []; devuelto: [texto: string]; faltante: [texto: string] }>();
const edicion = defineModel<EdicionDeLiquidacion>({ required: true });

const hayFaltante = computed(() => Number(edicion.value.faltante || 0) > 0);
const hayDeposito = computed(() => Number(edicion.value.devuelto || 0) > 0);
const sobrante = computed(() => formatearMonto(textoDeCentavos(edicion.value.sobrante)));
const escoger = computed(() => props.cuentas.length > 0);
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" :titulo="`Liquidar el retiro ${edicion.numero}`" @cerrar="emit('cerrar')">
    <form id="form-liquidar-retiro" class="space-y-4" novalidate @submit.prevent="emit('guardar')">
      <p class="text-sm">
        Del retiro de {{ edicion.custodio }} sobraron <strong>{{ sobrante }}</strong> que no se pagaron a proveedores.
        Diga cuánto se devuelve al banco y cuánto falta; juntos deben sumar {{ sobrante }}.
      </p>
      <p
        v-if="edicion.liquidaElCustodio"
        class="flex items-start gap-2 rounded-xl bg-trigo-300/30 p-3 text-sm ring-1 ring-trigo-500/40 dark:bg-trigo-500/10"
        role="status"
      >
        <TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {{ AVISO_DEL_CUSTODIO }}
      </p>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <CampoTexto
          :model-value="edicion.devuelto"
          etiqueta="Se devuelve al banco"
          tipo="number"
          paso="0.01"
          :error="errores.devuelto"
          @update:model-value="emit('devuelto', String($event ?? ''))"
        />
        <CampoTexto
          :model-value="edicion.faltante"
          etiqueta="Falta (no se devuelve)"
          tipo="number"
          paso="0.01"
          :error="errores.faltante"
          @update:model-value="emit('faltante', String($event ?? ''))"
        />
      </div>
      <CampoTexto
        v-if="hayFaltante"
        v-model="edicion.motivoDeFaltante"
        etiqueta="Por qué falta efectivo"
        requerido
        multilinea
        :longitud-maxima="MAXIMO_DEL_MOTIVO_DE_FALTANTE"
        ayuda="Queda en la auditoría. Contabilidad decide a qué cuenta se carga el faltante."
        :error="errores.motivoDeFaltante"
      />
      <template v-if="hayDeposito">
        <CampoSelector
          v-if="escoger"
          v-model="edicion.cuentaBancariaId"
          etiqueta="Cuenta donde se deposita"
          requerido
          :opciones="cuentas"
          :error="errores.cuentaBancariaId"
        />
        <CampoTexto
          v-model="edicion.referencia"
          etiqueta="Boleta de depósito"
          :longitud-maxima="MAXIMO_DE_REFERENCIA_DEL_RETIRO"
          ayuda="Opcional, pero conviene anotarla para la conciliación."
          :error="errores.referencia"
        />
      </template>
      <CampoTexto
        v-model="edicion.fecha"
        etiqueta="Fecha de la liquidación"
        tipo="date"
        :maximo="hoy"
        requerido
        :error="errores.fecha"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-liquidar-retiro" :cargando="enviando">Liquidar el retiro</BotonBase>
    </template>
  </VentanaModal>
</template>
