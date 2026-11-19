<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { restaDelCosto } from '../../composables/bandeja/lineas-de-bandeja';
import type { LineaDeBandeja } from '../../servicios/bandeja.api';

/** Una línea del libro con costo por capitalizar: lo que costó, lo ya capitalizado y lo que falta. */
const props = defineProps<{ linea: LineaDeBandeja; elegida: boolean }>();
const emit = defineEmits<{ alternar: []; descartar: [] }>();
const nombre = `línea ${props.linea.numeroDeLinea} de ${props.linea.documento}`;
</script>

<template>
  <div class="flex gap-3 py-3">
    <input
      v-permiso="'activos-fijos.costos.crear'"
      type="checkbox"
      class="mt-1 size-5 shrink-0 rounded border-tierra-300 text-campo-600 focus:ring-campo-500"
      :checked="elegida"
      :aria-label="`Elegir la ${nombre}`"
      @change="emit('alternar')"
    />
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p class="font-medium wrap-break-word">{{ linea.descripcion || linea.conceptoNombre }}</p>
        <InsigniaBase v-if="restaDelCosto(linea)" tono="tierra">Resta del costo</InsigniaBase>
        <InsigniaBase v-if="linea.bajoElUmbral" tono="trigo">Bajo el umbral</InsigniaBase>
        <InsigniaBase v-if="linea.anteriorALaFechaDeInicio" tono="trigo">Anterior a la fecha de inicio</InsigniaBase>
      </div>
      <p class="text-xs text-tierra-500">
        {{ linea.conceptoNombre }}
        <template v-if="linea.claseSugeridaNombre"> · Clase propuesta: {{ linea.claseSugeridaNombre }}</template>
        <template v-if="linea.activoSugeridoCodigo"> · Activo propuesto: {{ linea.activoSugeridoCodigo }}</template>
      </p>
      <p v-if="linea.bajoElUmbral" class="mt-1 text-xs text-tierra-600 dark:text-tierra-300">
        No llega al umbral de la empresa: descártela (era gasto) o regístrela como bien de control.
      </p>
      <p v-if="linea.anteriorALaFechaDeInicio" class="mt-1 text-xs text-tierra-600 dark:text-tierra-300">
        Si el bien ya estaba en el balance de apertura, cárguelo como saldo inicial y descarte esta línea.
      </p>
      <dl class="mt-2 grid grid-cols-3 gap-2 text-sm tabular-nums">
        <div>
          <dt class="text-xs text-tierra-500">Costo</dt>
          <dd>{{ formatearMonto(linea.costo) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-tierra-500">Capitalizado</dt>
          <dd>{{ formatearMonto(linea.capitalizado) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-tierra-500">Pendiente</dt>
          <dd class="font-semibold">{{ formatearMonto(linea.pendiente) }}</dd>
        </div>
      </dl>
    </div>
    <BotonBase
      v-permiso="'activos-fijos.bandeja.descartar'"
      variante="fantasma"
      pequeno
      :icono="Trash2"
      class="self-start"
      :aria-label="`Descartar la ${nombre}`"
      @click="emit('descartar')"
    >
      <span class="hidden sm:inline">Descartar</span>
    </BotonBase>
  </div>
</template>
