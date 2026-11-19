<script setup lang="ts">
import { computed } from 'vue';
import { resultadoDeLaConsulta, quehacerConElResultado } from '../../composables/plataforma/bitacora-del-banguat';
import type { FormularioDeCarga } from '../../composables/plataforma/usar-carga-manual';
import { formatearFecha } from '../../utilidades/formato';
import BotonBase from '../BotonBase.vue';
import CampoTexto from '../CampoTexto.vue';
import InsigniaBase from '../InsigniaBase.vue';
import VentanaModal from '../VentanaModal.vue';

const props = defineProps<{ monedas: string[]; errores: Record<string, string>; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; cargar: [] }>();
const carga = defineModel<FormularioDeCarga>({ required: true });

const rango = computed(() =>
  carga.value.desde === carga.value.hasta
    ? `del ${formatearFecha(carga.value.desde)}`
    : `del ${formatearFecha(carga.value.desde)} al ${formatearFecha(carga.value.hasta)}`,
);
const sinMonedas = computed(() => props.monedas.length === 0);
</script>

<template>
  <VentanaModal :abierta="carga.abierta" titulo="Cargar ahora desde el Banguat" @cerrar="emit('cerrar')">
    <form id="form-carga" class="space-y-4" @submit.prevent="emit('cargar')">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoTexto v-model="carga.desde" etiqueta="Desde" tipo="date" requerido :error="errores.desde" />
        <CampoTexto v-model="carga.hasta" etiqueta="Hasta" tipo="date" requerido :error="errores.hasta" />
      </div>
      <p v-if="sinMonedas" class="text-sm text-red-700 dark:text-red-400">
        No hay monedas activas con código del Banguat. Active una y únale su código en Monedas.
      </p>
      <p v-else class="text-sm text-tierra-700 dark:text-tierra-200">
        Se pedirá al Banguat el tipo de cambio {{ rango }} de {{ monedas.join(', ') }}. Lo que ya está cargado no se
        reemplaza; el máximo es un año (366 días).
      </p>
    </form>

    <p
      v-if="enviando"
      class="mt-4 rounded-lg bg-tierra-50 p-3 text-sm text-tierra-700 ring-1 ring-tierra-200 dark:bg-tierra-800/60 dark:text-tierra-200 dark:ring-tierra-700"
      role="status"
      aria-live="polite"
    >
      Pidiendo los tipos al Banguat. Puede tardar un par de minutos si el servicio está lento; la carga sigue aunque
      cierre esta ventana y su resultado queda en la bitácora.
    </p>

    <section v-if="carga.resultados" class="mt-5" aria-live="polite" aria-labelledby="titulo-resultado">
      <h3 id="titulo-resultado" class="text-sm font-semibold">Resultado</h3>
      <ul class="mt-2 divide-y divide-tierra-100 text-sm dark:divide-tierra-700">
        <li v-for="resumen in carga.resultados" :key="resumen.moneda" class="py-2">
          <p class="flex flex-wrap items-center gap-2">
            <span class="font-medium">{{ resumen.moneda }}</span>
            <InsigniaBase :tono="resultadoDeLaConsulta(resumen.resultado).tono">
              {{ resultadoDeLaConsulta(resumen.resultado).texto }}
            </InsigniaBase>
            <span class="text-tierra-600 dark:text-tierra-300">
              {{ resumen.filasNuevas }} {{ resumen.filasNuevas === 1 ? 'nuevo' : 'nuevos'
              }}<template v-if="resumen.filasRechazadas"
                >, {{ resumen.filasRechazadas }}
                {{ resumen.filasRechazadas === 1 ? 'rechazado' : 'rechazados' }}</template
              >
            </span>
          </p>
          <p v-if="quehacerConElResultado(resumen.resultado)" class="text-xs text-tierra-600 dark:text-tierra-300">
            {{ quehacerConElResultado(resumen.resultado) }}
          </p>
        </li>
      </ul>
    </section>

    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">{{
        carga.resultados ? 'Cerrar' : 'Cancelar'
      }}</BotonBase>
      <BotonBase tipo="submit" form="form-carga" :cargando="enviando" :deshabilitado="sinMonedas">
        {{ carga.resultados ? 'Cargar otra vez' : 'Cargar' }}
      </BotonBase>
    </template>
  </VentanaModal>
</template>
