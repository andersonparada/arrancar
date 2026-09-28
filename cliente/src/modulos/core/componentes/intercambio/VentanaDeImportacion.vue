<script setup lang="ts">
import { computed } from 'vue';
import { CircleAlert, CircleCheck, FileSpreadsheet } from 'lucide-vue-next';
import type { EstadoDeImportacion } from '../../composables/intercambio/usar-intercambio';
import { resumenDeRevision, ubicacionDelError } from '../../composables/intercambio/resumen-de-importacion';
import BotonBase from '../BotonBase.vue';
import VentanaModal from '../VentanaModal.vue';

/** Importar desde Excel: bajar la plantilla, elegir el archivo, ver la revisión e importar. */
const props = defineProps<{ estado: EstadoDeImportacion; titulo: string }>();
const emit = defineEmits<{ elegir: [archivo: File]; plantilla: []; importar: []; cerrar: [] }>();

const listo = computed(() => props.estado.resultado?.errores.length === 0);

function alElegir(evento: Event): void {
  const archivo = (evento.target as HTMLInputElement).files?.[0];
  if (archivo) emit('elegir', archivo);
}
</script>

<template>
  <VentanaModal :abierta="estado.abierta" :titulo="titulo" ancha @cerrar="emit('cerrar')">
    <div class="space-y-4 text-sm">
      <p class="text-tierra-600 dark:text-tierra-300">
        Llene la plantilla (la segunda hoja explica cada columna) y súbala. Primero se revisa todo; no se guarda nada
        hasta que usted confirme, y si una fila tiene problemas no se guarda ninguna.
      </p>
      <BotonBase variante="fantasma" pequeno :icono="FileSpreadsheet" @click="emit('plantilla')">
        Descargar la plantilla
      </BotonBase>

      <label class="block">
        <span class="mb-1.5 block font-medium">Archivo de Excel</span>
        <input
          type="file"
          accept=".xlsx"
          class="block w-full rounded-lg text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-campo-50 file:px-3 file:py-2 file:font-medium file:text-campo-800 dark:file:bg-tierra-700 dark:file:text-tierra-100"
          @change="alElegir"
        />
      </label>

      <p v-if="estado.revisando" class="text-tierra-500">Revisando el archivo…</p>
      <div v-else-if="estado.resultado" class="space-y-2">
        <p
          class="flex items-start gap-2 font-medium"
          :class="listo ? 'text-campo-700 dark:text-campo-300' : 'text-red-700 dark:text-red-400'"
        >
          <component :is="listo ? CircleCheck : CircleAlert" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {{ resumenDeRevision(estado.resultado) }}
        </p>
        <ul
          v-if="!listo"
          class="max-h-64 divide-y divide-tierra-100 overflow-y-auto rounded-lg ring-1 ring-tierra-200 dark:divide-tierra-700 dark:ring-tierra-700"
        >
          <li v-for="(error, i) in estado.resultado.errores" :key="i" class="px-3 py-2">
            <span class="font-medium">{{ ubicacionDelError(error) }}:</span> {{ error.mensaje }}
          </li>
        </ul>
      </div>
    </div>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase :deshabilitado="!listo" :cargando="estado.guardando" @click="emit('importar')">Importar</BotonBase>
    </template>
  </VentanaModal>
</template>
