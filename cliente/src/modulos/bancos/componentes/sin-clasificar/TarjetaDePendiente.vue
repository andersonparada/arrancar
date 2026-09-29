<script setup lang="ts">
import { formatearFecha, formatearMonto, formatearTexto } from '@/modulos/core/utilidades/formato';
import { marcaDeReversion } from '../../composables/movimientos/estado-de-reversion';
import { documentoDeFila } from '../../composables/movimientos/fila-del-reporte';
import { CLASE_DE_TIPO, SIGNO_DE_TIPO } from '../../composables/movimientos/estilo-de-tipo';
import type { FilaDelReporte } from '../../servicios/movimientos.api';

/**
 * Un movimiento sin clasificar. Quien puede clasificar (`bancos.notas.gestionar`) lo marca con la casilla; toda la
 * tarjeta es el área para tocar, cómoda en el celular.
 */
const props = defineProps<{ fila: FilaDelReporte; marcada: boolean }>();
const emit = defineEmits<{ alternar: [] }>();

const documento = () => documentoDeFila(props.fila);
</script>

<template>
  <label
    class="flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-tierra-200/70 has-[:checked]:ring-2 has-[:checked]:ring-campo-500 dark:bg-tierra-800/60 dark:ring-tierra-700"
  >
    <input
      v-permiso="'bancos.notas.gestionar'"
      type="checkbox"
      class="mt-1 size-5 rounded border-tierra-300 text-campo-600 focus:ring-campo-500"
      :checked="marcada"
      :aria-label="`Elegir ${documento().titulo} del ${formatearFecha(fila.fecha)}`"
      @change="emit('alternar')"
    />
    <div class="min-w-0 flex-1">
      <div class="flex items-start justify-between gap-2">
        <p class="font-medium">{{ documento().titulo }}</p>
        <p class="shrink-0 text-sm font-semibold" :class="CLASE_DE_TIPO[fila.tipo]">
          {{ SIGNO_DE_TIPO[fila.tipo] }} {{ formatearMonto(fila.monto) }}
        </p>
      </div>
      <p class="text-sm text-tierra-600 dark:text-tierra-300">
        {{ formatearFecha(fila.fecha) }} · {{ formatearTexto(fila.cuentaBancariaNombre) }}
      </p>
      <p v-if="fila.beneficiario" class="truncate text-sm text-tierra-600 dark:text-tierra-300">
        {{ fila.beneficiario }}
      </p>
      <p v-if="documento().subtitulo" class="truncate text-xs text-tierra-500">{{ documento().subtitulo }}</p>
      <p v-if="marcaDeReversion(fila)" class="text-xs text-amber-600 dark:text-amber-400">
        {{ marcaDeReversion(fila) }}: su inverso seguirá el concepto que elija.
      </p>
    </div>
  </label>
</template>
