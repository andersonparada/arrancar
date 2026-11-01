<script setup lang="ts">
import { CircleAlert, CircleCheck, Info } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import {
  hayRechazos,
  lineasDelResumen,
  rechazosRecortados,
  textoDelMotivo,
  titularDelResultado,
} from '../../composables/bandeja/datos-de-la-importacion';
import type { ResultadoDeImportarDte } from '../../servicios/dte-recibidos.api';
import { IMPORTAR_DE_LA_SAT as textos } from '../../textos-de-la-bandeja';

/** Cargar el archivo de la SAT: elegirlo, subirlo y ver qué entró y qué no. Cargar no registra nada. */
defineProps<{
  abierta: boolean;
  archivo: File | null;
  resultado: ResultadoDeImportarDte | null;
  errorDelArchivo: string;
  enviando: boolean;
}>();
const emit = defineEmits<{ elegir: [archivo: File]; cargar: []; cerrar: [] }>();

function alElegir(evento: Event): void {
  const elegido = (evento.target as HTMLInputElement).files?.[0];
  if (elegido) emit('elegir', elegido);
}
</script>

<template>
  <VentanaModal :abierta="abierta" :titulo="textos.titulo" ancha @cerrar="emit('cerrar')">
    <div class="space-y-4 text-sm">
      <p class="flex gap-2 rounded-lg bg-trigo-300/40 p-3 text-tierra-800 dark:bg-trigo-500/20 dark:text-trigo-300">
        <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{{ textos.instrucciones }}</span>
      </p>
      <label class="block">
        <span class="mb-1.5 block font-medium">{{ textos.archivo }}</span>
        <input
          type="file"
          accept=".xls,.xlsx,.csv"
          class="block w-full rounded-lg text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-campo-50 file:px-3 file:py-2 file:font-medium file:text-campo-800 dark:file:bg-tierra-700 dark:file:text-tierra-100"
          :aria-invalid="errorDelArchivo !== ''"
          aria-describedby="error-del-archivo"
          @change="alElegir"
        />
      </label>
      <p id="error-del-archivo" class="text-red-700 dark:text-red-400" role="alert">{{ errorDelArchivo }}</p>
      <p v-if="enviando" class="text-tierra-500" role="status">{{ textos.cargando }}</p>

      <div v-if="resultado" class="space-y-3" role="status">
        <p class="flex items-start gap-2 font-medium text-campo-700 dark:text-campo-300">
          <CircleCheck class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {{ titularDelResultado(resultado.lote) }}
        </p>
        <dl class="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
          <div
            v-for="linea in lineasDelResumen(resultado.lote)"
            :key="linea.etiqueta"
            class="flex justify-between gap-3"
          >
            <dt class="text-tierra-600 dark:text-tierra-300">{{ linea.etiqueta }}</dt>
            <dd class="font-medium tabular-nums">{{ linea.cantidad }}</dd>
          </div>
        </dl>
        <section v-if="resultado.avisos.length" aria-labelledby="avisos-de-la-carga">
          <h3 id="avisos-de-la-carga" class="mb-1 font-medium">{{ textos.avisos }}</h3>
          <ul class="list-disc space-y-1 pl-5 text-tierra-700 dark:text-tierra-200">
            <li v-for="aviso in resultado.avisos" :key="aviso">{{ aviso }}</li>
          </ul>
        </section>
        <section v-if="hayRechazos(resultado.lote)" aria-labelledby="rechazos-de-la-carga">
          <h3 id="rechazos-de-la-carga" class="mb-1 flex items-center gap-2 font-medium text-red-800 dark:text-red-300">
            <CircleAlert class="size-4" aria-hidden="true" />
            {{ textos.rechazadas }}
          </h3>
          <ul
            class="max-h-56 divide-y divide-tierra-100 overflow-y-auto rounded-lg ring-1 ring-tierra-200 dark:divide-tierra-700 dark:ring-tierra-700"
          >
            <li v-for="rechazo in resultado.lote.rechazos" :key="rechazo.fila" class="px-3 py-2">
              <span class="font-medium">Fila {{ rechazo.fila }}:</span> {{ textoDelMotivo(rechazo.motivo) }}
              <span class="block break-words text-tierra-500">{{ rechazo.detalle }}</span>
            </li>
          </ul>
          <p v-if="rechazosRecortados(resultado.lote)" class="mt-1 text-tierra-500">{{ textos.masRechazadas }}</p>
        </section>
      </div>
    </div>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">
        {{ resultado ? textos.listo : textos.cancelar }}
      </BotonBase>
      <BotonBase v-if="!resultado" :deshabilitado="!archivo" :cargando="enviando" @click="emit('cargar')">
        {{ textos.cargar }}
      </BotonBase>
    </template>
  </VentanaModal>
</template>
