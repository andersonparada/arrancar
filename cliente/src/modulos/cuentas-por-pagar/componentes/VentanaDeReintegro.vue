<script setup lang="ts">
import { computed } from 'vue';
import { Info } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import {
  MAXIMO_DE_LA_REFERENCIA_DEL_REINTEGRO,
  MAXIMO_DE_LAS_OBSERVACIONES,
  type EdicionDeReintegro,
} from '../composables/reintegros/reintegro';
import { fechaDeHoy } from '../composables/dinero';
import type { FormaDeReintegro } from '../servicios/tipos-de-reintegros';

/**
 * Registrar el reintegro de una o varias notas del mismo proveedor: el proveedor devolvió el saldo a favor, por depósito
 * o en efectivo. `resumen` dice qué va a pasar; sin cuentas de Bancos solo se ofrece el efectivo.
 */
const props = defineProps<{
  resumen: string;
  cuentas: { valor: string; texto: string }[];
  sinCuentas: boolean;
  avisoDeEfectivo: string;
  errores: Record<string, string>;
  enviando: boolean;
}>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeReintegro>({ required: true });

const formas = computed<{ valor: FormaDeReintegro; texto: string }[]>(() => [
  ...(props.sinCuentas ? [] : [{ valor: 'deposito' as const, texto: 'Depósito en una cuenta bancaria' }]),
  { valor: 'efectivo', texto: 'Efectivo' },
]);
const esDeposito = computed(() => edicion.value.forma === 'deposito');
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" titulo="Registrar reintegro" @cerrar="emit('cerrar')">
    <form id="form-reintegro" class="space-y-4" @submit.prevent="emit('guardar')">
      <p class="text-sm text-tierra-600 dark:text-tierra-300">
        Use esto cuando <strong>{{ edicion.proveedorNombre }}</strong> le devolvió el dinero que tenía a favor.
      </p>
      <p v-if="sinCuentas" class="text-xs text-tierra-500" role="note">
        No hay cuentas bancarias disponibles para usted: solo se puede registrar en efectivo.
      </p>

      <fieldset class="space-y-3">
        <legend class="text-sm font-medium">Notas de crédito y monto devuelto</legend>
        <CampoTexto
          v-for="(nota, indice) in edicion.notas"
          :key="nota.notaId"
          v-model="nota.monto"
          :etiqueta="`${nota.titulo} (a favor ${formatearMonto(nota.saldo)})`"
          tipo="number"
          paso="0.01"
          requerido
          :error="errores[`notas.${indice}.monto`]"
        />
      </fieldset>

      <CampoSelector v-model="edicion.forma" etiqueta="Cómo lo devolvió" requerido :opciones="formas" />
      <CampoSelector
        v-if="esDeposito"
        v-model="edicion.cuentaBancariaId"
        etiqueta="Cuenta donde cayó el depósito"
        requerido
        :opciones="cuentas"
        :error="errores.cuentaBancariaId"
      />
      <CampoTexto
        v-model="edicion.referencia"
        :etiqueta="esDeposito ? 'Número de boleta o transferencia' : 'Número del recibo de caja o de la boleta'"
        :requerido="!esDeposito"
        :longitud-maxima="MAXIMO_DE_LA_REFERENCIA_DEL_REINTEGRO"
        contar
        :ayuda="esDeposito ? 'Opcional, pero conviene anotarla para la conciliación.' : 'Obligatorio en efectivo.'"
        :error="errores.referencia"
      />
      <CampoTexto
        v-model="edicion.fecha"
        etiqueta="Fecha del reintegro"
        tipo="date"
        requerido
        :maximo="fechaDeHoy()"
        :error="errores.fecha"
      />
      <CampoTexto
        v-model="edicion.observaciones"
        etiqueta="Observaciones"
        multilinea
        :longitud-maxima="MAXIMO_DE_LAS_OBSERVACIONES"
        contar
        :error="errores.observaciones"
      />

      <p class="text-sm" aria-live="polite">{{ resumen }}</p>
      <p v-if="!esDeposito" class="flex gap-2 text-sm text-tierra-800 dark:text-trigo-300" role="note">
        <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{{ avisoDeEfectivo }}</span>
      </p>
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-reintegro" :cargando="enviando">Registrar reintegro</BotonBase>
    </template>
  </VentanaModal>
</template>
