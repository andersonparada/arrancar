<script setup lang="ts">
import { formatearMonto, formatearTexto } from '@/modulos/core/utilidades/formato';
import type { ProveedorDelSat2237 } from '../../servicios/sat-2237.api';
import { VENTANA_DEL_SAT_2237 as textos } from '../../textos-del-sat-2237';

/** Los principales proveedores de la sección 6: NIT, nombre, facturas y base sin IVA. */
defineProps<{ proveedores: ProveedorDelSat2237[] }>();
</script>

<template>
  <p
    v-if="proveedores.length === 0"
    class="rounded-2xl bg-tierra-100 p-4 text-sm text-tierra-700 dark:bg-tierra-800 dark:text-tierra-200"
  >
    {{ textos.sinProveedores }}
  </p>
  <div
    v-else
    class="max-w-full overflow-x-auto rounded-2xl bg-white ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700"
    role="region"
    aria-label="Sección 6 del SAT-2237"
    tabindex="0"
  >
    <table class="w-full border-collapse text-sm">
      <thead class="bg-tierra-100 text-left text-xs uppercase text-tierra-700 dark:bg-tierra-800 dark:text-tierra-200">
        <tr>
          <th scope="col" class="px-3 py-2 font-semibold">NIT</th>
          <th scope="col" class="px-3 py-2 font-semibold">Nombre</th>
          <th scope="col" class="px-3 py-2 text-right font-semibold">Facturas</th>
          <th scope="col" class="px-3 py-2 text-right font-semibold">Base sin IVA</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
        <tr v-for="proveedor in proveedores" :key="proveedor.nit ?? proveedor.nombre">
          <td class="whitespace-nowrap px-3 py-2">{{ formatearTexto(proveedor.nit) }}</td>
          <td class="min-w-48 px-3 py-2">{{ proveedor.nombre }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ proveedor.cantidadDeFacturas }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(proveedor.base) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
