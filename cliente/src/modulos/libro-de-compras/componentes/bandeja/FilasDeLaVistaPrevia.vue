<script setup lang="ts">
import { CircleAlert, CircleCheck, UserPlus } from 'lucide-vue-next';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { textoDelError, type FilaConError } from '../../composables/bandeja/datos-de-la-confirmacion';
import { netoDeLaFila } from '../../composables/bandeja/resumen-de-la-confirmacion';
import type { ResultadoDeVistaPrevia } from '../../servicios/dte-recibidos.api';

/** Lo que pasaría con cada fila marcada: lo que se registraría (con su neto a pagar y avisos) o lo que hay que corregir. */
defineProps<{
  titulos: ReadonlyMap<string, string>;
  tipos: ReadonlyMap<string, string>;
  listas: ResultadoDeVistaPrevia[];
  conError: FilaConError[];
}>();
</script>

<template>
  <ul class="space-y-2" aria-label="Vista previa de lo marcado">
    <li
      v-for="fila in conError"
      :key="fila.id"
      class="flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-900 dark:bg-red-950 dark:text-red-200"
    >
      <CircleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div class="min-w-0">
        <p class="font-medium">{{ titulos.get(fila.id) }}</p>
        <p>{{ textoDelError(fila.error) }}</p>
      </div>
    </li>
    <li
      v-for="fila in listas"
      :key="fila.id"
      class="flex gap-2 rounded-lg bg-campo-50 p-3 text-sm dark:bg-campo-900/40"
    >
      <CircleCheck class="mt-0.5 size-4 shrink-0 text-campo-700 dark:text-campo-300" aria-hidden="true" />
      <div class="min-w-0 flex-1">
        <div class="flex justify-between gap-2">
          <p class="font-medium">
            {{ titulos.get(fila.id) }}
            <InsigniaBase v-if="'proveedorNuevo' in fila && fila.proveedorNuevo" tono="trigo" class="ml-1 gap-1">
              <UserPlus class="size-3" aria-hidden="true" />Proveedor nuevo
            </InsigniaBase>
          </p>
          <p v-if="'documento' in fila" class="shrink-0 tabular-nums">
            {{ netoDeLaFila(tipos.get(fila.id), fila.documento.netoAPagar).etiqueta }}
            {{ formatearMonto(netoDeLaFila(tipos.get(fila.id), fila.documento.netoAPagar).monto) }}
          </p>
        </div>
        <ul
          v-if="'avisos' in fila && fila.avisos.length"
          class="mt-1 list-disc pl-4 text-xs text-tierra-600 dark:text-tierra-300"
        >
          <li v-for="aviso in fila.avisos" :key="aviso">{{ aviso }}</li>
        </ul>
      </div>
    </li>
  </ul>
</template>
