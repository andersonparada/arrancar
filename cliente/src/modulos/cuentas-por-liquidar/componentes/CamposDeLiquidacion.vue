<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { OPCIONES_DE_FORMA, opcionesDeCuentas, opcionesDelMedio } from '../composables/anticipos/opciones-de-medios';
import { fechaDeHoy } from '../composables/reportes/fechas-de-reportes';
import {
  MAXIMO_DE_CUOTAS,
  MAXIMO_DE_REFERENCIA_DE_LIQUIDACION,
  MAXIMO_DEL_MOTIVO_DE_NO_LIQUIDADO,
  type Cuadre,
  type EdicionDeLiquidacion,
} from '../composables/liquidacion/edicion-de-liquidacion';
import type { MediosParaElegir } from '../servicios/opciones.api';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import CamposDeLoNoLiquidado from './CamposDeLoNoLiquidado.vue';

/** Los campos de la liquidación: la fecha, lo devuelto, lo no liquidado o, si se gastó de más, el reembolso. */
const props = defineProps<{
  medios: MediosParaElegir | null;
  cuadre: Cuadre;
  esEmpleado: boolean;
  errores: Record<string, string>;
}>();
defineEmits<{ devuelto: [valor: string]; noLiquidado: [valor: string] }>();
const edicion = defineModel<EdicionDeLiquidacion>({ required: true });
const cuentas = computed(() => opcionesDeCuentas(props.medios));
const opcionesDelReembolso = computed(() => opcionesDelMedio(edicion.value.formaDelReembolso, props.medios));
const hoy = fechaDeHoy();
</script>

<template>
  <div class="space-y-5">
    <CampoTexto
      v-model="edicion.fecha"
      etiqueta="Fecha de la liquidación"
      tipo="date"
      :maximo="hoy"
      requerido
      :error="errores.fecha"
    />

    <fieldset v-if="cuadre.reembolsa" class="space-y-3">
      <legend class="text-sm font-semibold">Se gastó de más: reembolso al beneficiario</legend>
      <p class="text-sm text-tierra-600 dark:text-tierra-300">
        La empresa le debe {{ formatearMonto(cuadre.reembolsa) }}. Bancos lo registra con el cheque o la transferencia
        que escoja.
      </p>
      <CampoSelector
        v-model="edicion.formaDelReembolso"
        etiqueta="Cómo se reembolsa"
        requerido
        :opciones="OPCIONES_DE_FORMA"
      />
      <CampoSelector
        v-model="edicion.medioDelReembolso"
        :etiqueta="edicion.formaDelReembolso === 'cheque' ? 'Chequera' : 'Cuenta bancaria'"
        requerido
        :opciones="opcionesDelReembolso"
        :error="errores.medioDelReembolso"
      />
      <p v-if="opcionesDelReembolso.length === 0" class="text-sm text-tierra-600 dark:text-tierra-300">
        No hay cuentas ni chequeras activas. Créelas en
        <RouterLink to="/bancos/cuentas-bancarias" class="font-medium underline underline-offset-2">Bancos</RouterLink>.
      </p>
      <CampoInterruptor
        v-if="edicion.formaDelReembolso === 'cheque'"
        v-model="edicion.noNegociable"
        etiqueta="No negociable"
      />
      <CampoTexto
        v-else
        v-model="edicion.referenciaDelReembolso"
        etiqueta="Número de la transferencia"
        :longitud-maxima="MAXIMO_DE_REFERENCIA_DE_LIQUIDACION"
        :error="errores.referenciaDelReembolso"
      />
    </fieldset>

    <template v-else>
      <fieldset class="space-y-3">
        <legend class="text-sm font-semibold">¿Qué pasa con lo que falta por justificar?</legend>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CampoTexto
            :model-value="edicion.devuelto"
            etiqueta="Lo devuelve a la empresa"
            tipo="number"
            paso="0.01"
            :error="errores.devuelto"
            @update:model-value="$emit('devuelto', String($event ?? ''))"
          />
          <CampoTexto
            :model-value="edicion.noLiquidado"
            etiqueta="Queda sin liquidar"
            tipo="number"
            paso="0.01"
            @update:model-value="$emit('noLiquidado', String($event ?? ''))"
          />
        </div>
        <p
          class="text-sm font-medium"
          :class="cuadre.cuadra ? 'text-campo-700 dark:text-campo-300' : 'text-red-700 dark:text-red-300'"
          role="status"
        >
          {{
            cuadre.cuadra
              ? 'Cuadra con lo que falta por justificar.'
              : `Faltan ${formatearMonto(cuadre.faltaRepartir)} por repartir.`
          }}
        </p>
      </fieldset>

      <fieldset v-if="cuadre.hayDevuelto" class="space-y-3">
        <legend class="text-sm font-semibold">Depósito de lo devuelto</legend>
        <CampoSelector
          v-model="edicion.cuentaDelDeposito"
          etiqueta="Cuenta donde se deposita"
          requerido
          :opciones="cuentas"
          :error="errores.cuentaBancariaId"
        />
        <CampoTexto
          v-model="edicion.referencia"
          etiqueta="Boleta del depósito"
          :longitud-maxima="MAXIMO_DE_REFERENCIA_DE_LIQUIDACION"
          ayuda="Opcional, pero conviene anotarla para la conciliación."
          :error="errores.referencia"
        />
      </fieldset>

      <CamposDeLoNoLiquidado
        v-if="cuadre.hayNoLiquidado"
        v-model="edicion"
        :es-empleado="esEmpleado"
        :errores="errores"
        :maximo-de-cuotas="MAXIMO_DE_CUOTAS"
        :maximo-del-motivo="MAXIMO_DEL_MOTIVO_DE_NO_LIQUIDADO"
      />
    </template>
  </div>
</template>
