<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { debeLlevarALaBandeja } from '../../composables/flujo-de-efectivo/textos-del-flujo';
import type { LineaAparte } from '../../servicios/flujo-de-efectivo.api';
import MontoDelFlujo from './MontoDelFlujo.vue';

/**
 * Lo que no es de ninguna actividad pero hace falta para que el período cuadre: transferencias entre cuentas
 * propias (con una sola cuenta), movimientos sin actividad y lo que falta clasificar, con su enlace a la bandeja.
 */
defineProps<{ lineas: LineaAparte[] }>();
</script>

<template>
  <div
    class="overflow-x-auto rounded-2xl bg-white ring-1 ring-tierra-200/70 print:overflow-visible print:shadow-none print:ring-0 dark:bg-tierra-800/60 dark:ring-tierra-700"
  >
    <table class="w-full min-w-[30rem] text-left text-sm">
      <caption class="px-4 pt-4 pb-2 text-left text-base font-semibold">
        Otras líneas del período
      </caption>
      <thead class="border-b border-tierra-100 text-xs tracking-wide text-tierra-500 uppercase dark:border-tierra-700">
        <tr>
          <th scope="col" class="px-4 py-2 font-medium">Línea</th>
          <th scope="col" class="px-4 py-2 text-right font-medium">Entradas</th>
          <th scope="col" class="px-4 py-2 text-right font-medium">Salidas</th>
          <th scope="col" class="px-4 py-2 text-right font-medium">Neto</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
        <tr v-for="linea in lineas" :key="linea.clave">
          <th scope="row" class="px-4 py-2.5 font-normal">
            {{ linea.etiqueta }}
            <RouterLink
              v-if="debeLlevarALaBandeja(linea)"
              v-permiso="'bancos.movimientos.ver'"
              to="/bancos/sin-clasificar"
              class="ml-1 font-medium underline underline-offset-2 print:hidden"
            >
              Clasificar ({{ linea.cantidad }})
            </RouterLink>
          </th>
          <td class="px-4 py-2.5 text-right"><MontoDelFlujo :monto="linea.entradas" /></td>
          <td class="px-4 py-2.5 text-right"><MontoDelFlujo :monto="linea.salidas" /></td>
          <td class="px-4 py-2.5 text-right"><MontoDelFlujo :monto="linea.neto" /></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
