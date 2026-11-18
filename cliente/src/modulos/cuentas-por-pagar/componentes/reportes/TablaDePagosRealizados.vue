<script setup lang="ts">
import { RouterLink } from 'vue-router';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { formatearFecha, formatearMonto, formatearTexto } from '@/modulos/core/utilidades/formato';
import {
  TEXTOS_DE_FORMA,
  textoDelDocumentoPagado,
  textoDeQuienRegistro,
} from '../../composables/reportes/pagos-realizados';
import type { LineaDePagoRealizado } from '../../servicios/tipos-de-reportes-de-pagos';
import EnlaceDeProveedorDelReporte from './EnlaceDeProveedorDelReporte.vue';

/**
 * Los pagos en tabla, una fila por documento pagado; se desliza dentro de su tarjeta, no la página. En papel
 * muestra todas las filas y repite el encabezado en cada hoja. La ficha del pago aún no existe: se muestra su número.
 */
defineProps<{ filas: LineaDePagoRealizado[] }>();
</script>

<template>
  <div
    class="overflow-x-auto rounded-2xl bg-white ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700 print:overflow-visible print:ring-0"
  >
    <table class="w-full text-sm print:text-[9px]">
      <caption class="sr-only">
        Pagos realizados, una fila por documento pagado
      </caption>
      <thead
        class="border-b border-tierra-100 text-xs text-tierra-500 dark:border-tierra-700 dark:text-tierra-300 print:table-header-group"
      >
        <tr>
          <th scope="col" class="px-3 py-2 text-left font-medium">Pago</th>
          <th scope="col" class="px-3 py-2 text-left font-medium">Proveedor y documento</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Monto</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Retención</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Cubre</th>
          <th scope="col" class="px-3 py-2 text-left font-medium">Registró el documento</th>
          <th scope="col" class="px-3 py-2 text-left font-medium">Autorizó el documento</th>
          <th scope="col" class="px-3 py-2 text-left font-medium">Registró el pago</th>
          <th scope="col" class="px-3 py-2 text-left font-medium">Estado</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
        <tr
          v-for="fila in filas"
          :key="`${fila.pagoId}-${fila.documentoId}`"
          class="align-top print:break-inside-avoid"
          :class="{ 'text-tierra-500 dark:text-tierra-400': fila.estado === 'anulado' }"
        >
          <th scope="row" class="min-w-40 px-3 py-2 text-left font-normal">
            <span class="block font-medium">Pago N.º {{ fila.numeroDelPago }}</span>
            <span class="block text-xs">{{ formatearFecha(fila.fecha) }} · {{ TEXTOS_DE_FORMA[fila.forma] }}</span>
            <span v-if="fila.documentoBancario || fila.cuenta" class="block text-xs">
              {{ [fila.documentoBancario, fila.cuenta].filter(Boolean).join(' · ') }}
            </span>
          </th>
          <td class="min-w-44 px-3 py-2">
            <EnlaceDeProveedorDelReporte :id="fila.proveedorId" :nombre="fila.proveedorNombre" />
            <RouterLink
              :to="{ name: 'cuentas-por-pagar.documentos.ficha', params: { documentoId: fila.documentoId } }"
              class="block rounded text-xs text-campo-700 hover:underline focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none dark:text-campo-300 print:text-current print:no-underline"
            >
              Documento {{ textoDelDocumentoPagado(fila) }}
            </RouterLink>
            <span class="block text-xs">Contraseña {{ fila.contrasena }}</span>
          </td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(fila.monto) }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(fila.retencionDescontada) }}</td>
          <td class="px-3 py-2 text-right font-semibold tabular-nums">{{ formatearMonto(fila.cubre) }}</td>
          <td class="min-w-36 px-3 py-2 text-xs">{{ textoDeQuienRegistro(fila) || '—' }}</td>
          <td class="px-3 py-2 text-xs">{{ formatearTexto(fila.autorizoElDocumento) }}</td>
          <td class="min-w-32 px-3 py-2 text-xs">
            {{ formatearTexto(fila.registroElPago) }}
            <InsigniaBase v-if="fila.misma" tono="trigo" class="mt-1 block w-fit">Misma persona</InsigniaBase>
          </td>
          <td class="min-w-32 px-3 py-2 text-xs">
            <template v-if="fila.estado === 'anulado'">
              <InsigniaBase tono="rojo">Anulado</InsigniaBase>
              <span class="block">{{ formatearFecha(fila.fechaDeAnulacion) }}</span>
              <span class="block">{{ formatearTexto(fila.motivoDeAnulacion) }}</span>
            </template>
            <template v-else>Vigente</template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
