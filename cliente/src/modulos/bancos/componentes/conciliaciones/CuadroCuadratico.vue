<script setup lang="ts">
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { Cuadratica } from '../../servicios/conciliaciones.api';

/** El cuadro cuadrático: saldo inicial, ingresos, egresos y saldo final, de libros y de banco. */
defineProps<{ libros: Cuadratica; banco: Cuadratica }>();

const FILAS: { clave: keyof Cuadratica; etiqueta: string }[] = [
  { clave: 'saldoInicial', etiqueta: 'Saldo inicial' },
  { clave: 'ingresos', etiqueta: 'Ingresos' },
  { clave: 'egresos', etiqueta: 'Egresos' },
  { clave: 'saldoFinal', etiqueta: 'Saldo final' },
];
</script>

<template>
  <TarjetaBase class="overflow-x-auto">
    <table class="w-full min-w-[24rem] text-sm">
      <thead>
        <tr class="text-left text-xs text-tierra-500">
          <th class="pb-2 font-medium"></th>
          <th class="pb-2 font-medium">Según libros</th>
          <th class="pb-2 font-medium">Según banco</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-tierra-100 dark:divide-tierra-800">
        <tr v-for="fila in FILAS" :key="fila.clave">
          <td class="py-1.5 text-tierra-500">{{ fila.etiqueta }}</td>
          <td class="py-1.5 font-medium" :class="{ 'font-semibold': fila.clave === 'saldoFinal' }">
            {{ formatearMonto(libros[fila.clave]) }}
          </td>
          <td class="py-1.5 font-medium" :class="{ 'font-semibold': fila.clave === 'saldoFinal' }">
            {{ formatearMonto(banco[fila.clave]) }}
          </td>
        </tr>
      </tbody>
    </table>
  </TarjetaBase>
</template>
