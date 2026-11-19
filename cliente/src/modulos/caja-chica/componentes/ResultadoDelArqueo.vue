<script setup lang="ts">
import { computed } from 'vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { ResultadoDelConteo } from '../composables/arqueos/edicion-de-arqueo';

/** Lo contado frente a lo esperado, en vivo: dice con palabras si cuadra, falta o sobra, no solo con color. */
const props = defineProps<{ resultado: ResultadoDelConteo; esperado: string }>();

const titulos = { cuadra: 'El efectivo cuadra', faltante: 'Falta efectivo', sobrante: 'Sobra efectivo' };
const clases = {
  cuadra: 'ring-campo-500 bg-campo-100/60 dark:bg-campo-900/40',
  faltante: 'ring-red-500 bg-red-50 dark:bg-red-950/40',
  sobrante: 'ring-trigo-500 bg-trigo-300/30 dark:bg-trigo-500/10',
};
const diferencia = computed(() => Math.abs(Number(props.resultado.diferencia)).toFixed(2));
</script>

<template>
  <TarjetaBase class="space-y-3 ring-2" :class="clases[resultado.tipo]" role="status" aria-live="polite">
    <p class="text-lg font-semibold">
      {{ titulos[resultado.tipo]
      }}<template v-if="resultado.tipo !== 'cuadra'"> por {{ formatearMonto(diferencia) }}</template>
    </p>
    <dl class="space-y-1 text-sm">
      <div class="flex justify-between gap-3">
        <dt>Efectivo contado</dt>
        <dd class="tabular-nums">{{ formatearMonto(resultado.contado) }}</dd>
      </div>
      <div class="flex justify-between gap-3">
        <dt>Cheques y valores por cambiar</dt>
        <dd class="tabular-nums">{{ formatearMonto(resultado.porCambiar) }}</dd>
      </div>
      <div class="flex justify-between gap-3">
        <dt>El sistema espera</dt>
        <dd class="tabular-nums">{{ formatearMonto(esperado) }}</dd>
      </div>
    </dl>
    <p v-if="resultado.tipo === 'faltante'" class="text-sm">
      Al registrar se crea un comprobante de faltante que queda pendiente de reponer.
    </p>
    <p v-else-if="resultado.tipo === 'sobrante'" class="text-sm">
      Al registrar se crea un comprobante de sobrante que resta de lo pendiente de reponer.
    </p>
  </TarjetaBase>
</template>
