<script setup lang="ts">
import { computed } from 'vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import {
  lineasDeLaFormula,
  ROTULO_DE_SITUACION,
  situacionDelCuadre,
  textoDeLaDiferencia,
} from '../../composables/saldos-iniciales/cuadre-de-saldo-inicial';
import type { ResumenDeSaldoInicial } from '../../servicios/tipos-de-saldos-iniciales';
import { ETIQUETA_DE_LIBROS_ANTERIORES } from '../../textos-de-apertura';

/**
 * El cuadre de una cuenta al corte: la fórmula línea por línea hasta el saldo en libros y, si hay dato, su
 * comparación con los libros anteriores (verde si cuadra, rojo si no). `grande` es el de la ficha.
 */
const props = defineProps<{ cuenta: ResumenDeSaldoInicial; grande?: boolean }>();

const lineas = computed(() => lineasDeLaFormula(props.cuenta));
const situacion = computed(() => situacionDelCuadre(props.cuenta));
const TONOS = { sin_saldo: 'tierra', sin_dato: 'trigo', cuadra: 'campo', no_cuadra: 'rojo' } as const;
const colorDeLaDiferencia = computed(() =>
  props.cuenta.cuadra ? 'text-campo-700 dark:text-campo-300' : 'text-red-700 dark:text-red-400',
);
</script>

<template>
  <div :class="grande ? 'space-y-3 text-base' : 'space-y-2 text-sm'">
    <dl class="space-y-1">
      <div
        v-for="linea in lineas"
        :key="linea.clave"
        class="flex items-baseline justify-between gap-3"
        :class="linea.signo === '=' ? 'border-t border-tierra-200 pt-1.5 font-semibold dark:border-tierra-700' : ''"
      >
        <dt class="min-w-0 break-words text-tierra-700 dark:text-tierra-200">
          <span class="inline-block w-4 text-tierra-500" aria-hidden="true">{{ linea.signo }}</span>
          {{ linea.etiqueta }}
        </dt>
        <dd class="shrink-0 tabular-nums">{{ formatearMonto(linea.monto) }}</dd>
      </div>
    </dl>

    <dl v-if="cuenta.forma !== 'sin_saldo'" class="space-y-1 rounded-lg bg-tierra-50 p-2.5 dark:bg-tierra-900/50">
      <div class="flex items-baseline justify-between gap-3">
        <dt class="min-w-0 break-words text-tierra-600 dark:text-tierra-300">{{ ETIQUETA_DE_LIBROS_ANTERIORES }}</dt>
        <dd class="shrink-0 tabular-nums">
          {{
            cuenta.saldoSegunLibrosAnteriores === null ? 'Sin dato' : formatearMonto(cuenta.saldoSegunLibrosAnteriores)
          }}
        </dd>
      </div>
      <div v-if="cuenta.diferencia !== null" class="flex items-baseline justify-between gap-3">
        <dt class="min-w-0 break-words text-tierra-600 dark:text-tierra-300">Diferencia</dt>
        <dd class="shrink-0 font-semibold tabular-nums" :class="colorDeLaDiferencia">
          {{ formatearMonto(cuenta.diferencia) }}
        </dd>
      </div>
      <p v-if="cuenta.diferencia !== null" class="text-xs" :class="colorDeLaDiferencia">
        {{ textoDeLaDiferencia(cuenta.diferencia) }}
      </p>
    </dl>

    <p v-if="cuenta.forma !== 'sin_saldo'" class="flex flex-wrap items-center gap-2">
      <InsigniaBase :tono="TONOS[situacion]">{{ ROTULO_DE_SITUACION[situacion] }}</InsigniaBase>
      <span v-if="cuenta.totalPosfechados !== '0.00'" class="text-xs text-tierra-500">
        Posfechados (fuera del cuadre): {{ formatearMonto(cuenta.totalPosfechados) }}
      </span>
    </p>
  </div>
</template>
