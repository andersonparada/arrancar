<script setup lang="ts">
import { computed } from 'vue';
import { Calculator, Info, LoaderCircle } from 'lucide-vue-next';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { AjustesEnEdicion } from '../../composables/documentos/ajustes-de-retenciones';
import { sumarMontos } from '../../composables/documentos/detalles-de-documento';
import type { RespuestaDeDocumento } from '../../servicios/registro-de-documentos.api';
import { AYUDA_DE_LA_VISTA_PREVIA } from '../../textos-del-registro';
import MotivosDelDocumento from '../documentos/MotivosDelDocumento.vue';
import TotalesDelDocumento from '../documentos/TotalesDelDocumento.vue';
import RetencionPropuesta from './RetencionPropuesta.vue';

/** Lo que el servidor calculó: totales, IVA, costo, retenciones propuestas y avisos. No guarda nada. */
const props = defineProps<{ respuesta: RespuestaDeDocumento | null; calculando: boolean; desactualizada: boolean }>();
const ajustes = defineModel<AjustesEnEdicion>({ required: true });

const documento = computed(() => props.respuesta?.documento ?? null);
const costo = computed(() => sumarMontos(documento.value?.lineas.map((linea) => linea.costo) ?? []));
</script>

<template>
  <TarjetaBase>
    <div class="mb-3 flex items-center justify-between gap-2">
      <h2 class="flex items-center gap-2 font-semibold">
        <Calculator class="size-4" aria-hidden="true" /> Vista previa
      </h2>
      <p v-if="calculando" class="flex items-center gap-1.5 text-xs text-tierra-500" role="status">
        <LoaderCircle class="size-3.5 animate-spin" aria-hidden="true" /> Calculando…
      </p>
    </div>

    <p v-if="!documento" class="text-sm text-tierra-600 dark:text-tierra-300">
      Elija el proveedor, escriba el número, la fecha y al menos una línea con su concepto y su total: aquí aparecerá el
      IVA, el costo y las retenciones.
    </p>

    <div v-else class="space-y-4 transition-opacity" :class="{ 'opacity-60': desactualizada || calculando }">
      <p v-if="desactualizada" class="text-xs text-tierra-600 dark:text-tierra-300">
        Estas cifras son del último cálculo que se pudo hacer: corrija lo señalado arriba para actualizarlas.
      </p>
      <MotivosDelDocumento :ficha="documento" />
      <TotalesDelDocumento :ficha="documento" />
      <p class="text-sm">
        <span class="text-tierra-500">Costo o gasto que se registra:</span>
        <span class="ml-1 font-semibold tabular-nums">{{ formatearMonto(costo) }}</span>
      </p>

      <ul v-if="respuesta && respuesta.avisos.length" class="space-y-2" aria-label="Avisos">
        <li
          v-for="aviso in respuesta.avisos"
          :key="aviso"
          class="flex gap-2 rounded-xl bg-trigo-300/40 p-3 text-sm text-tierra-800 dark:bg-trigo-500/20 dark:text-trigo-300"
        >
          <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{{ aviso }}</span>
        </li>
      </ul>

      <section v-if="documento.retenciones.length" aria-label="Retenciones propuestas" class="space-y-3">
        <h3 class="text-sm font-semibold text-tierra-700 dark:text-tierra-200">Retenciones propuestas</h3>
        <RetencionPropuesta
          v-for="retencion in documento.retenciones"
          :key="retencion.regla"
          v-model="ajustes"
          :retencion="retencion"
        />
      </section>
      <p v-else class="text-sm text-tierra-600 dark:text-tierra-300">
        No hay retenciones que practicar en este documento.
      </p>
    </div>
    <p class="mt-4 text-xs text-tierra-500">{{ AYUDA_DE_LA_VISTA_PREVIA }}</p>
  </TarjetaBase>
</template>
