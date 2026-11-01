<script setup lang="ts">
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { VistaDelFormularioSat2237 } from '../../servicios/sat-2237.api';

/** La sección 9: cantidad y monto de operaciones por clase de documento. */
defineProps<{ seccion: VistaDelFormularioSat2237['seccion9'] }>();
</script>

<template>
  <div
    class="max-w-full overflow-x-auto rounded-2xl bg-white ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700"
    role="region"
    aria-label="Sección 9 del SAT-2237"
    tabindex="0"
  >
    <table class="w-full border-collapse text-sm">
      <thead class="bg-tierra-100 text-left text-xs uppercase text-tierra-700 dark:bg-tierra-800 dark:text-tierra-200">
        <tr>
          <th scope="col" class="px-3 py-2 font-semibold">Operación</th>
          <th scope="col" class="px-3 py-2 text-right font-semibold">{{ seccion.cantidad }}</th>
          <th scope="col" class="px-3 py-2 text-right font-semibold">{{ seccion.monto }}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
        <tr v-for="linea in seccion.lineas" :key="linea.clave">
          <th scope="row" class="min-w-40 px-3 py-2 text-left font-medium">{{ linea.nombre }}</th>
          <td class="px-3 py-2 text-right tabular-nums">{{ linea.cantidad }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(linea.base) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
