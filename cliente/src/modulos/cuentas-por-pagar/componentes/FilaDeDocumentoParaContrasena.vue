<script setup lang="ts">
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { etiquetaDeDocumento } from '../composables/contrasenas/edicion-de-contrasena';
import { textoDeEstado, tonoDeEstado } from '../composables/detalles-de-documento';
import type { CargoDeContrasena, NotaDisponible } from '../servicios/tipos-de-contrasenas';
import { TIPOS_DE_DOCUMENTO } from '../textos';

/**
 * Un documento que se puede meter en la contraseña, con su casilla. Un cargo muestra lo que se debe de él; una nota,
 * lo que tiene a favor.
 */
defineProps<{
  cargo?: CargoDeContrasena;
  nota?: NotaDisponible;
  marcado: boolean;
}>();
defineEmits<{ alternar: [] }>();
</script>

<template>
  <label
    class="flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 ring-tierra-200 transition hover:bg-tierra-50 dark:ring-tierra-700 dark:hover:bg-tierra-800/60"
    :class="marcado ? 'bg-campo-50 ring-2 ring-campo-500 dark:bg-campo-900/30' : ''"
  >
    <input
      type="checkbox"
      class="mt-1 size-5 shrink-0 rounded border-tierra-300 text-campo-600 focus:ring-campo-500"
      :checked="marcado"
      @change="$emit('alternar')"
    />
    <span v-if="cargo" class="min-w-0 flex-1">
      <span class="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span class="font-medium">{{ TIPOS_DE_DOCUMENTO[cargo.tipo] }} {{ etiquetaDeDocumento(cargo) }}</span>
        <InsigniaBase :tono="tonoDeEstado(cargo.estado)">{{ textoDeEstado(cargo.estado) }}</InsigniaBase>
        <InsigniaBase v-if="cargo.origen === 'saldo_inicial'" tono="tierra">Saldo inicial</InsigniaBase>
      </span>
      <span class="mt-1 block text-sm text-tierra-600 dark:text-tierra-300">
        Emitida {{ formatearFecha(cargo.fechaEmision) }} ·
        {{ cargo.vencimiento ? `Vence ${formatearFecha(cargo.vencimiento)}` : 'Sin vencimiento' }}
      </span>
    </span>
    <span v-else-if="nota" class="min-w-0 flex-1">
      <span class="block font-medium">Nota de crédito {{ etiquetaDeDocumento(nota) }}</span>
      <span class="mt-1 block text-sm text-tierra-600 dark:text-tierra-300">
        Emitida {{ formatearFecha(nota.fechaEmision) }}
      </span>
    </span>
    <span class="shrink-0 text-right">
      <span class="block font-semibold" :class="nota ? 'text-campo-700 dark:text-campo-300' : ''">
        {{ nota ? `− ${formatearMonto(nota.saldoLibre)}` : formatearMonto(cargo?.saldo ?? '0') }}
      </span>
      <span class="block text-xs text-tierra-500">{{ nota ? 'a favor' : 'por pagar' }}</span>
    </span>
  </label>
</template>
