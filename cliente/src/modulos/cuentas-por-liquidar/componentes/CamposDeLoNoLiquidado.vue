<script setup lang="ts">
import { computed } from 'vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { EdicionDeLiquidacion } from '../composables/liquidacion/edicion-de-liquidacion';

/**
 * Lo que queda sin liquidar necesita dónde va (cobrarlo en cuotas, renta del trabajo si es empleado, o pérdida) y por qué.
 * Queda en la auditoría.
 */
const props = defineProps<{
  esEmpleado: boolean;
  errores: Record<string, string>;
  maximoDeCuotas: number;
  maximoDelMotivo: number;
}>();
const edicion = defineModel<EdicionDeLiquidacion>({ required: true });
const opciones = computed(() => [
  { valor: 'cobrar', texto: 'Cobrarlo al beneficiario en cuotas' },
  {
    valor: 'renta_del_trabajo',
    texto: props.esEmpleado ? 'Tratarlo como renta del trabajo' : 'Renta del trabajo (solo si es empleado)',
    deshabilitada: !props.esEmpleado,
  },
  { valor: 'perdida', texto: 'Asumirlo como pérdida de la empresa' },
]);
</script>

<template>
  <fieldset class="space-y-3">
    <legend class="text-sm font-semibold">Lo que queda sin liquidar</legend>
    <CampoSelector
      v-model="edicion.destino"
      etiqueta="Qué se hace con eso"
      requerido
      :opciones="opciones"
      :error="errores.destinoDeNoLiquidado"
    />
    <template v-if="edicion.destino === 'cobrar'">
      <CampoTexto
        v-model="edicion.cuotas"
        etiqueta="Cuotas"
        tipo="number"
        paso="1"
        requerido
        :error="errores.cuotas"
        :ayuda="`Hasta ${maximoDeCuotas}. Lo normal es repartirlo en 5 o más cuotas; con pago voluntario puede ser en menos.`"
      />
      <CampoInterruptor
        v-model="edicion.pagoVoluntario"
        etiqueta="El beneficiario acepta pagar en menos cuotas"
        descripcion="Pago voluntario: déjelo apagado si es un descuento de su sueldo."
      />
    </template>
    <CampoTexto
      v-model="edicion.motivoDeNoLiquidado"
      etiqueta="Por qué queda sin liquidar"
      requerido
      multilinea
      :longitud-maxima="maximoDelMotivo"
      ayuda="Queda en la auditoría junto con la liquidación."
      :error="errores.motivoDeNoLiquidado"
    />
  </fieldset>
</template>
