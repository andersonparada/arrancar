<script setup lang="ts">
import { computed } from 'vue';
import { FileInput, RotateCcw, Trash2 } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { tituloDeLaFila } from '../../composables/bandeja/datos-de-la-bandeja';
import {
  datosDeLaFilaPendiente,
  insigniasDeLaFila,
  notaDeLaFila,
  textoDeLoQueFalta,
} from '../../composables/bandeja/detalles-de-la-fila';
import type { DteRecibido } from '../../servicios/dte-recibidos.api';
import { TEXTOS_DE_LAS_ACCIONES as acciones } from '../../textos-de-la-bandeja';

/**
 * Un DTE de la SAT. Si se puede marcar, toda el área de los datos es la casilla (cómodo en el celular); los botones
 * quedan fuera de la etiqueta para que no marquen la fila. Lo que la fila usaría hoy se muestra con «Sin elegir» donde falta.
 */
const props = defineProps<{
  fila: DteRecibido;
  conceptos: ReadonlyMap<string, string>;
  marcable: boolean;
  marcada: boolean;
}>();
const emit = defineEmits<{ alternar: []; abrir: []; descartar: []; restaurar: [] }>();

const titulo = computed(() => tituloDeLaFila(props.fila));
const datos = computed(() =>
  props.fila.estado === 'pendiente' ? datosDeLaFilaPendiente(props.fila, props.conceptos, formatearFecha) : [],
);
const falta = computed(() => textoDeLoQueFalta(props.fila));
const puedeAbrir = computed(() => props.fila.estado === 'pendiente');
const puedeDescartar = computed(() => props.fila.estado === 'pendiente' || props.fila.estado === 'bloqueado');
</script>

<template>
  <div
    class="rounded-2xl bg-white p-4 ring-1 ring-tierra-200/70 has-checked:ring-2 has-checked:ring-campo-500 dark:bg-tierra-800/60 dark:ring-tierra-700"
    :class="{ 'opacity-80': fila.estado === 'descartado' }"
  >
    <component :is="marcable ? 'label' : 'div'" class="flex items-start gap-3" :class="{ 'cursor-pointer': marcable }">
      <input
        v-if="marcable"
        v-permiso="'libro-de-compras.documentos.importar'"
        type="checkbox"
        class="mt-1 size-5 shrink-0 rounded border-tierra-300 text-campo-600 focus:ring-campo-500"
        :checked="marcada"
        :aria-label="`Elegir ${titulo} de ${fila.nombreEmisor}`"
        @change="emit('alternar')"
      />
      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-2">
          <p class="font-semibold">{{ titulo }}</p>
          <p class="shrink-0 font-semibold tabular-nums">{{ formatearMonto(fila.total) }}</p>
        </div>
        <p class="truncate text-sm text-tierra-700 dark:text-tierra-200">{{ fila.nombreEmisor }}</p>
        <p class="text-xs text-tierra-500">
          NIT {{ fila.nitEmisor }} · Emitido {{ formatearFecha(fila.fechaEmision) }} · IVA
          {{ formatearMonto(fila.iva) }}
        </p>
        <div class="mt-2 flex flex-wrap gap-1.5">
          <InsigniaBase v-for="insignia in insigniasDeLaFila(fila)" :key="insignia.texto" :tono="insignia.tono">
            {{ insignia.texto }}
          </InsigniaBase>
        </div>
        <dl v-if="datos.length" class="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          <div v-for="dato in datos" :key="dato.etiqueta" class="min-w-0">
            <dt class="text-xs text-tierra-500">{{ dato.etiqueta }}</dt>
            <dd class="truncate" :class="{ 'text-tierra-400': dato.valor === 'Sin elegir' }">{{ dato.valor }}</dd>
          </div>
        </dl>
        <p v-if="falta" class="mt-2 text-sm text-amber-700 dark:text-amber-400">{{ falta }}</p>
        <p v-if="fila.propuesta?.avisoDelPeriodo" class="mt-1 text-xs text-tierra-500">
          {{ fila.propuesta.avisoDelPeriodo }}
        </p>
        <p v-if="notaDeLaFila(fila)" class="mt-2 text-sm text-tierra-600 dark:text-tierra-300">
          {{ notaDeLaFila(fila) }}
        </p>
      </div>
    </component>
    <div
      v-if="puedeAbrir || puedeDescartar || fila.estado === 'descartado' || fila.documentoId"
      class="mt-3 flex flex-wrap justify-end gap-2"
    >
      <BotonBase
        v-if="puedeAbrir"
        v-permiso="'libro-de-compras.documentos.crear'"
        variante="secundario"
        pequeno
        :icono="FileInput"
        :aria-label="`${acciones.abrirEnElFormulario}: ${titulo} de ${fila.nombreEmisor}`"
        @click="emit('abrir')"
      >
        {{ acciones.abrirEnElFormulario }}
      </BotonBase>
      <BotonBase
        v-if="puedeDescartar"
        v-permiso="'libro-de-compras.dte-recibidos.descartar'"
        variante="fantasma"
        pequeno
        :icono="Trash2"
        @click="emit('descartar')"
      >
        {{ acciones.descartar }}
      </BotonBase>
      <BotonBase
        v-if="fila.estado === 'descartado'"
        v-permiso="'libro-de-compras.dte-recibidos.descartar'"
        variante="secundario"
        pequeno
        :icono="RotateCcw"
        @click="emit('restaurar')"
      >
        {{ acciones.restaurar }}
      </BotonBase>
      <RouterLink
        v-if="fila.documentoId"
        :to="{ name: 'libro-de-compras.documentos.ficha', params: { documentoId: fila.documentoId } }"
        class="rounded-lg px-2.5 py-1.5 text-sm font-medium text-campo-800 hover:bg-campo-100 dark:text-campo-300 dark:hover:bg-campo-900"
      >
        {{ acciones.verFactura }}
      </RouterLink>
    </div>
  </div>
</template>
