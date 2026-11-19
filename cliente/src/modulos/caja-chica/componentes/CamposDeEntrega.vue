<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { opcionesDelMedio } from '../composables/fondos/opciones-de-fondos';
import type { EdicionDeEntrega } from '../composables/fondos/edicion-de-fondo';
import type { ChequeraParaElFondo, CuentaParaElFondo } from '../servicios/catalogos.api';
import type { FormaDeEntrega } from '../servicios/tipos-de-fondos';
import { AYUDA_DE_LA_FECHA, AYUDA_DEL_BANCO, AYUDA_DEL_CHEQUE, FORMAS_DE_ENTREGA } from '../textos';

/**
 * Cómo sale el dinero del banco hacia el fondo (al abrirlo y al aumentarlo): con un cheque de una chequera o con una
 * nota de débito de una cuenta, más el monto y la fecha. Bancos genera el movimiento; aquí no se registra nada allá.
 */
const props = defineProps<{
  chequeras: readonly ChequeraParaElFondo[];
  cuentas: readonly CuentaParaElFondo[];
  cargando: boolean;
  errores: Record<string, string>;
  /** El nombre que irá en el cheque si no se escribe otro beneficiario (el custodio). */
  beneficiarioPropuesto: string;
}>();
const edicion = defineModel<EdicionDeEntrega>({ required: true });

const formas = Object.keys(FORMAS_DE_ENTREGA) as FormaDeEntrega[];
const esCheque = computed(() => edicion.value.forma === 'cheque');
const opciones = computed(() => opcionesDelMedio(edicion.value.forma, props));
const errorDelMedio = computed(() => props.errores.chequeraId ?? props.errores.cuentaBancariaId);
const sinMedios = computed(() => !props.cargando && opciones.value.length === 0);

function elegirForma(forma: FormaDeEntrega): void {
  edicion.value.forma = forma;
  edicion.value.medioId = null;
}
</script>

<template>
  <div class="space-y-4">
    <fieldset>
      <legend class="mb-1 text-sm font-medium">¿Cómo sale el dinero del banco?</legend>
      <div
        role="radiogroup"
        aria-label="Forma de entrega"
        class="grid grid-cols-2 gap-1 rounded-xl bg-tierra-100 p-1 dark:bg-tierra-800"
      >
        <button
          v-for="forma in formas"
          :key="forma"
          type="button"
          role="radio"
          :aria-checked="edicion.forma === forma"
          class="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
          :class="
            edicion.forma === forma
              ? 'bg-white text-tierra-900 shadow-sm dark:bg-tierra-600 dark:text-white'
              : 'text-tierra-700 hover:bg-white/60 dark:text-tierra-200 dark:hover:bg-tierra-700'
          "
          @click="elegirForma(forma)"
        >
          {{ FORMAS_DE_ENTREGA[forma] }}
        </button>
      </div>
      <p class="mt-1 text-xs text-tierra-500">{{ AYUDA_DEL_BANCO }}</p>
    </fieldset>

    <CampoSelector
      v-model="edicion.medioId"
      :etiqueta="esCheque ? 'Chequera' : 'Cuenta bancaria'"
      requerido
      :opciones="opciones"
      :error="errorDelMedio"
    />
    <p v-if="sinMedios" class="text-sm text-tierra-600 dark:text-tierra-300" role="status">
      No hay {{ esCheque ? 'chequeras activas' : 'cuentas bancarias activas' }} que pueda ver. Créelas en
      <RouterLink
        :to="esCheque ? '/bancos/chequeras' : '/bancos/cuentas-bancarias'"
        class="font-medium underline underline-offset-2"
        >Bancos</RouterLink
      >
      o pida el acceso a Bancos.
    </p>

    <template v-if="esCheque">
      <CampoTexto
        v-model="edicion.beneficiario"
        etiqueta="Beneficiario del cheque"
        :placeholder="beneficiarioPropuesto"
        :longitud-maxima="150"
        :ayuda="AYUDA_DEL_CHEQUE"
        :error="errores.beneficiario"
      />
      <CampoInterruptor v-model="edicion.noNegociable" etiqueta="No negociable" />
    </template>
    <CampoTexto
      v-else
      v-model="edicion.referencia"
      etiqueta="Referencia de la transferencia"
      :longitud-maxima="100"
      :error="errores.referencia"
    />

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <CampoTexto v-model="edicion.monto" etiqueta="Monto" tipo="number" paso="any" requerido :error="errores.monto" />
      <CampoTexto
        v-model="edicion.fecha"
        etiqueta="Fecha"
        tipo="date"
        :ayuda="AYUDA_DE_LA_FECHA"
        :error="errores.fecha"
      />
    </div>
    <CampoTexto
      v-model="edicion.observaciones"
      etiqueta="Observaciones"
      multilinea
      :longitud-maxima="500"
      :error="errores.observaciones"
    />
  </div>
</template>
