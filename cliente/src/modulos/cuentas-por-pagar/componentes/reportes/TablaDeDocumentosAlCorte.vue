<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import {
  estaVencida,
  notasDeLaFila,
  textoDeContrasena,
  textoDeTramo,
  textoDeVencimiento,
  tituloDeLaFila,
} from '../../composables/reportes/detalles-de-documentos-al-corte';
import { TEXTOS_DE_ESTADO_DE_PAGO } from '../../composables/reportes/vistas-de-documentos';
import type { FilaDeDocumentoAlCorte, TotalesDeDocumentosAlCorte } from '../../servicios/tipos-de-reportes';

/**
 * La tabla de cargos al corte; se desliza dentro de su tarjeta, no la página. En papel muestra todas las filas y
 * repite el encabezado en cada hoja. `totales` van al pie (de todo lo filtrado).
 */
defineProps<{ filas: FilaDeDocumentoAlCorte[]; totales: TotalesDeDocumentosAlCorte }>();

const columnas = ['Emisión', 'Vence', 'Tramo', 'Total', 'Retenciones', 'Notas', 'Pagado', 'Ajustado'];
</script>

<template>
  <div
    class="overflow-x-auto rounded-2xl bg-white ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700 print:overflow-visible print:ring-0"
  >
    <table
      class="w-full text-sm print:text-[8px] print:leading-tight print:[&_td]:px-1 print:[&_td]:whitespace-normal print:[&_th]:px-1"
    >
      <caption class="sr-only">
        Cargos por pagar al corte
      </caption>
      <thead
        class="border-b border-tierra-100 text-xs text-tierra-500 dark:border-tierra-700 dark:text-tierra-300 print:table-header-group"
      >
        <tr>
          <th scope="col" class="px-3 py-2 text-left font-medium">Documento</th>
          <th v-for="columna in columnas" :key="columna" scope="col" class="px-3 py-2 text-right font-medium">
            {{ columna }}
          </th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Saldo</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Comprometido</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Disponible para pagar</th>
          <th scope="col" class="px-3 py-2 text-left font-medium">Estado</th>
          <th scope="col" class="px-3 py-2 text-left font-medium">Contraseña</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
        <tr v-for="fila in filas" :key="fila.id" class="align-top print:break-inside-avoid">
          <th scope="row" class="min-w-44 px-3 py-2 text-left font-normal print:min-w-0">
            <RouterLink
              :to="{ name: 'cuentas-por-pagar.documentos.ficha', params: { documentoId: fila.id } }"
              class="rounded font-medium text-campo-700 hover:underline focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none dark:text-campo-300 print:text-current print:no-underline"
            >
              {{ tituloDeLaFila(fila) }}
            </RouterLink>
            <span class="block text-xs text-tierra-600 dark:text-tierra-300">{{ fila.proveedorNombre }}</span>
            <span v-if="!fila.autorizado" class="block text-xs text-tierra-500">Sin autorizar</span>
            <span v-for="nota in notasDeLaFila(fila, formatearMonto)" :key="nota" class="block text-xs text-tierra-500">
              {{ nota }}
            </span>
          </th>
          <td class="px-3 py-2 text-right whitespace-nowrap">{{ formatearFecha(fila.fechaEmision) }}</td>
          <td
            class="px-3 py-2 text-right whitespace-nowrap"
            :class="{ 'font-medium text-red-700 dark:text-red-300': estaVencida(fila) }"
          >
            {{ textoDeVencimiento(fila) }}
          </td>
          <td class="px-3 py-2 text-right whitespace-nowrap">{{ textoDeTramo(fila) }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(fila.total) }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(fila.retenciones) }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(fila.notasAplicadas) }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(fila.pagado) }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(fila.ajustado) }}</td>
          <td class="px-3 py-2 text-right font-semibold tabular-nums">{{ formatearMonto(fila.saldo) }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(fila.comprometido) }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(fila.disponible) }}</td>
          <td class="px-3 py-2 whitespace-nowrap">{{ TEXTOS_DE_ESTADO_DE_PAGO[fila.estadoDePago] }}</td>
          <td class="px-3 py-2">{{ textoDeContrasena(fila) ?? '—' }}</td>
        </tr>
      </tbody>
      <tfoot class="border-t-2 border-tierra-200 font-semibold dark:border-tierra-600">
        <tr>
          <th scope="row" class="px-3 py-2 text-left">Total de lo filtrado</th>
          <td colspan="3"></td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(totales.total) }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(totales.retenciones) }}</td>
          <td></td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(totales.pagado) }}</td>
          <td></td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(totales.saldo) }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(totales.comprometido) }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(totales.disponible) }}</td>
          <td colspan="2"></td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>
