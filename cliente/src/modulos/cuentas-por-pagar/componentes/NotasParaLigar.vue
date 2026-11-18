<script setup lang="ts">
import { computed } from 'vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import {
  errorDelRangoDeNotas,
  hayFiltroDeNotas,
  TEXTO_DE_NOTAS_AL_TOPE,
  type FiltroDeNotas,
} from '../composables/pagos/filtro-de-notas';
import type { NotaParaLigar } from '../servicios/tipos-de-pagos';

/** Las notas de débito que ya están en Bancos, marcadas para Cuentas por pagar, con lo que les queda por aplicar. */
const props = defineProps<{
  notas: NotaParaLigar[];
  error?: string;
  /** Las cuentas bancarias por las que se puede filtrar, ya por nombre. */
  cuentas: OpcionBuscable<string>[];
  /** La lista llegó al tope del servidor: puede haber más notas. */
  alTope: boolean;
  cargando: boolean;
}>();
const elegida = defineModel<string>({ default: '' });
const filtro = defineModel<FiltroDeNotas>('filtro', { required: true });
const errorDelRango = computed(() => errorDelRangoDeNotas(filtro.value));
const filtrada = computed(() => hayFiltroDeNotas(filtro.value));
const opcionesDeCuenta = computed(() => [{ valor: '', texto: 'Todas las cuentas' }, ...props.cuentas]);
</script>

<template>
  <fieldset class="space-y-2">
    <legend class="mb-1 text-sm font-medium text-tierra-700 dark:text-tierra-200">
      Nota de débito de Bancos <span class="text-red-600" aria-hidden="true">*</span>
    </legend>
    <div class="grid gap-2 sm:grid-cols-3">
      <CampoSelector v-model="filtro.cuentaBancariaId" etiqueta="Cuenta bancaria" :opciones="opcionesDeCuenta" />
      <CampoTexto v-model="filtro.desde" tipo="date" etiqueta="Nota desde" :error="errorDelRango ?? undefined" />
      <CampoTexto v-model="filtro.hasta" tipo="date" etiqueta="Nota hasta" />
    </div>
    <p
      v-if="notas.length === 0 && filtrada"
      class="rounded-lg bg-tierra-100 px-3 py-3 text-sm text-tierra-700 dark:bg-tierra-800 dark:text-tierra-200"
      role="status"
    >
      Ninguna nota coincide con ese filtro. Cambie la cuenta o las fechas.
    </p>
    <p
      v-else-if="notas.length === 0 && !cargando"
      class="rounded-lg bg-tierra-100 px-3 py-3 text-sm text-tierra-700 dark:bg-tierra-800 dark:text-tierra-200"
    >
      No hay notas de débito marcadas para Cuentas por pagar con algo por aplicar. En Bancos, abra la nota del banco y
      use «Marcar para Cuentas por pagar».
    </p>
    <p v-if="alTope" class="text-sm text-tierra-800 dark:text-tierra-100" role="status">
      {{ TEXTO_DE_NOTAS_AL_TOPE }}
    </p>
    <label
      v-for="nota in notas"
      :key="nota.movimientoId"
      class="flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 ring-tierra-200 has-checked:bg-campo-50 has-checked:ring-2 has-checked:ring-campo-500 dark:ring-tierra-700 dark:has-checked:bg-campo-950/30"
    >
      <input
        v-model="elegida"
        type="radio"
        name="nota-para-ligar"
        :value="nota.movimientoId"
        class="mt-1 size-4 accent-campo-700"
      />
      <span class="min-w-0 flex-1 text-sm">
        <span class="block font-medium">
          Nota {{ nota.numero ?? 'sin número' }} · {{ nota.cuentaBancariaNombre }} · {{ formatearFecha(nota.fecha) }}
        </span>
        <span class="block text-tierra-600 dark:text-tierra-300">
          Por aplicar <strong>{{ formatearMonto(nota.disponible) }}</strong> de {{ formatearMonto(nota.monto) }}
          <template v-if="nota.referencia"> · ref. {{ nota.referencia }}</template>
        </span>
        <span v-if="nota.beneficiario" class="block text-tierra-600 dark:text-tierra-300">
          A nombre de {{ nota.beneficiario }}
        </span>
      </span>
    </label>
    <p v-if="error" class="text-sm text-red-700 dark:text-red-400" role="alert">{{ error }}</p>
  </fieldset>
</template>
