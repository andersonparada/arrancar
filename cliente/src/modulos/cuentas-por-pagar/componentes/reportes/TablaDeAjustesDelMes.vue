<script setup lang="ts">
import { RouterLink } from 'vue-router';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { formatearFecha, formatearFechaHora, formatearMonto, formatearTexto } from '@/modulos/core/utilidades/formato';
import { TEXTOS_DE_CAUSA, TEXTOS_DE_EFECTO } from '../../composables/reportes/ajustes-del-mes';
import type { FilaDeAjusteDelMes } from '../../servicios/tipos-de-reportes-de-control';
import EnlaceDeProveedorDelReporte from './EnlaceDeProveedorDelReporte.vue';

/** Los ajustes de saldo (de este mes o anulados este mes) en tabla; la tabla se desliza, no la página. */
defineProps<{ filas: FilaDeAjusteDelMes[]; titulo: string }>();
</script>

<template>
  <table class="w-full text-sm print:text-[9px]">
    <caption class="sr-only">
      {{
        titulo
      }}
    </caption>
    <thead
      class="border-b border-tierra-100 text-xs text-tierra-500 dark:border-tierra-700 dark:text-tierra-300 print:table-header-group"
    >
      <tr>
        <th scope="col" class="px-3 py-2 text-left font-medium">Fecha</th>
        <th scope="col" class="px-3 py-2 text-left font-medium">Documento y proveedor</th>
        <th scope="col" class="px-3 py-2 text-left font-medium">Causa y efecto</th>
        <th scope="col" class="px-3 py-2 text-right font-medium">Monto</th>
        <th scope="col" class="px-3 py-2 text-left font-medium">Motivo y referencia</th>
        <th scope="col" class="px-3 py-2 text-left font-medium">Registró</th>
        <th scope="col" class="px-3 py-2 text-left font-medium">Estado</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
      <tr
        v-for="fila in filas"
        :key="fila.id"
        class="align-top print:break-inside-avoid"
        :class="{ 'text-tierra-500 dark:text-tierra-400': fila.estado === 'anulado' }"
      >
        <th scope="row" class="px-3 py-2 text-left font-normal whitespace-nowrap">{{ formatearFecha(fila.fecha) }}</th>
        <td class="min-w-44 px-3 py-2">
          <RouterLink
            :to="{ name: 'cuentas-por-pagar.documentos.ficha', params: { documentoId: fila.documentoId } }"
            class="rounded font-medium text-campo-700 hover:underline focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none dark:text-campo-300 print:text-current print:no-underline"
          >
            {{ fila.documento }}
          </RouterLink>
          <span class="block text-xs"
            ><EnlaceDeProveedorDelReporte :id="fila.proveedorId" :nombre="fila.proveedorNombre"
          /></span>
          <InsigniaBase v-if="fila.anioAnterior" tono="trigo" class="mt-1">Año anterior</InsigniaBase>
        </td>
        <td class="min-w-36 px-3 py-2">
          {{ TEXTOS_DE_CAUSA[fila.causa] }}
          <span class="block text-xs text-tierra-500">{{ TEXTOS_DE_EFECTO[fila.efecto] }}</span>
        </td>
        <td class="px-3 py-2 text-right font-semibold tabular-nums">{{ formatearMonto(fila.monto) }}</td>
        <td class="min-w-48 px-3 py-2 text-xs">
          {{ fila.motivo }}
          <span v-if="fila.referencia" class="block">Referencia: {{ fila.referencia }}</span>
          <span v-if="fila.pago" class="block">Pago: {{ fila.pago }}</span>
        </td>
        <td class="px-3 py-2 text-xs">{{ formatearTexto(fila.registro) }}</td>
        <td class="min-w-36 px-3 py-2 text-xs">
          <template v-if="fila.estado === 'anulado'">
            <InsigniaBase tono="rojo">Anulado</InsigniaBase>
            <span class="block">{{ formatearTexto(fila.anuladoPor) }} · {{ formatearFechaHora(fila.anuladoEn) }}</span>
            <span class="block">{{ formatearTexto(fila.motivoDeAnulacion) }}</span>
          </template>
          <template v-else>Vigente</template>
        </td>
      </tr>
    </tbody>
  </table>
</template>
