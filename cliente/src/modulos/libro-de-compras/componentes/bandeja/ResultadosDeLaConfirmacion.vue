<script setup lang="ts">
import { CircleAlert, CircleCheck } from 'lucide-vue-next';
import {
  textoDelError,
  type FilaConError,
  type FilaRegistrada,
} from '../../composables/bandeja/datos-de-la-confirmacion';

/** Lo que pasó con cada fila al confirmar. Las que fallaron siguen pendientes y marcadas, para corregirlas y reintentar. */
defineProps<{ titulos: ReadonlyMap<string, string>; registradas: FilaRegistrada[]; conError: FilaConError[] }>();
</script>

<template>
  <div class="space-y-3" role="status">
    <p class="flex items-center gap-2 font-medium">
      <CircleCheck class="size-5 text-campo-700 dark:text-campo-300" aria-hidden="true" />
      {{ registradas.length === 1 ? 'Se registró 1 factura.' : `Se registraron ${registradas.length} facturas.` }}
    </p>
    <ul
      v-if="registradas.some(({ avisos }) => avisos.length)"
      class="space-y-1 text-sm text-tierra-600 dark:text-tierra-300"
    >
      <template v-for="fila in registradas" :key="fila.id">
        <li v-for="aviso in fila.avisos" :key="aviso">
          <strong>{{ titulos.get(fila.id) }}:</strong> {{ aviso }}
        </li>
      </template>
    </ul>
    <template v-if="conError.length">
      <p class="flex items-center gap-2 font-medium text-red-800 dark:text-red-300">
        <CircleAlert class="size-5" aria-hidden="true" />
        {{
          conError.length === 1
            ? '1 factura no se registró y sigue pendiente:'
            : `${conError.length} facturas no se registraron y siguen pendientes:`
        }}
      </p>
      <ul class="space-y-2">
        <li
          v-for="fila in conError"
          :key="fila.id"
          class="rounded-lg bg-red-50 p-3 text-sm text-red-900 dark:bg-red-950 dark:text-red-200"
        >
          <p class="font-medium">{{ titulos.get(fila.id) }}</p>
          <p>{{ textoDelError(fila.error) }}</p>
        </li>
      </ul>
    </template>
  </div>
</template>
