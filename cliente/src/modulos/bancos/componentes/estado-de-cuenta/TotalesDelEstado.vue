<script setup lang="ts">
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { TotalesDelEstado } from '../../composables/estado-de-cuenta/totales-del-estado-de-cuenta';

/** Los débitos y créditos del periodo por tipo de documento; solo para revisar, el saldo lo manda el servidor. */
defineProps<{ totales: TotalesDelEstado }>();
</script>

<template>
  <TarjetaBase class="break-inside-avoid print:shadow-none">
    <h3 class="font-semibold">Totales del periodo por tipo</h3>
    <div class="mt-2 overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="text-xs text-tierra-500">
          <tr>
            <th class="py-1 font-medium">Tipo</th>
            <th class="py-1 text-right font-medium">Cantidad</th>
            <th class="py-1 text-right font-medium">Débitos</th>
            <th class="py-1 text-right font-medium">Créditos</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
          <tr v-for="tipo in totales.porTipo" :key="tipo.etiqueta">
            <td class="py-1.5">{{ tipo.etiqueta }}</td>
            <td class="py-1.5 text-right tabular-nums">{{ tipo.cantidad }}</td>
            <td class="py-1.5 text-right tabular-nums">{{ formatearMonto(tipo.debitos) }}</td>
            <td class="py-1.5 text-right tabular-nums">{{ formatearMonto(tipo.creditos) }}</td>
          </tr>
          <tr class="font-semibold">
            <td class="py-1.5" colspan="2">Total</td>
            <td class="py-1.5 text-right tabular-nums">{{ formatearMonto(totales.debitos) }}</td>
            <td class="py-1.5 text-right tabular-nums">{{ formatearMonto(totales.creditos) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </TarjetaBase>
</template>
