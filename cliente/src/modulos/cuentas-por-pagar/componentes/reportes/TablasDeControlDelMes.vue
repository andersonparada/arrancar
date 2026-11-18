<script setup lang="ts">
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { formatearFecha, formatearFechaHora, formatearMonto, formatearTexto } from '@/modulos/core/utilidades/formato';
import { textoDeLaBaja } from '../../composables/reportes/ajustes-del-mes';
import type {
  FilaDeAplicacionManual,
  FilaDeDocumentoRevertido,
  FilaDePagoAApertura,
} from '../../servicios/tipos-de-reportes-de-control';
import EnlaceDeProveedorDelReporte from './EnlaceDeProveedorDelReporte.vue';

/** Las tablas de las secciones 3 a 5 de R8; cada una se muestra solo con los datos que recibe. */
defineProps<{
  aplicaciones?: FilaDeAplicacionManual[];
  pagosAApertura?: FilaDePagoAApertura[];
  documentos?: FilaDeDocumentoRevertido[];
}>();

const cabecera = 'border-b border-tierra-100 text-xs text-tierra-500 dark:border-tierra-700 dark:text-tierra-300';
const cuerpo = 'divide-y divide-tierra-100 dark:divide-tierra-700';
</script>

<template>
  <table v-if="aplicaciones" class="w-full text-sm print:text-[9px]">
    <caption class="sr-only">
      Aplicaciones manuales del mes
    </caption>
    <thead :class="cabecera">
      <tr>
        <th scope="col" class="px-3 py-2 text-left font-medium">Fecha</th>
        <th scope="col" class="px-3 py-2 text-left font-medium">Proveedor</th>
        <th scope="col" class="px-3 py-2 text-left font-medium">Nota y cargo</th>
        <th scope="col" class="px-3 py-2 text-right font-medium">Monto</th>
        <th scope="col" class="px-3 py-2 text-left font-medium">Referencia del acuerdo</th>
        <th scope="col" class="px-3 py-2 text-left font-medium">Registró</th>
      </tr>
    </thead>
    <tbody :class="cuerpo">
      <tr v-for="fila in aplicaciones" :key="fila.id" class="align-top print:break-inside-avoid">
        <th scope="row" class="px-3 py-2 text-left font-normal whitespace-nowrap">{{ formatearFecha(fila.fecha) }}</th>
        <td class="min-w-40 px-3 py-2">
          <EnlaceDeProveedorDelReporte :id="fila.proveedorId" :nombre="fila.proveedorNombre" />
        </td>
        <td class="px-3 py-2 text-xs">{{ fila.nota }} → {{ fila.cargo }}</td>
        <td class="px-3 py-2 text-right font-semibold tabular-nums">{{ formatearMonto(fila.monto) }}</td>
        <td class="min-w-40 px-3 py-2 text-xs">{{ formatearTexto(fila.referencia) }}</td>
        <td class="px-3 py-2 text-xs">{{ formatearTexto(fila.registro) }}</td>
      </tr>
    </tbody>
  </table>

  <table v-else-if="pagosAApertura" class="w-full text-sm print:text-[9px]">
    <caption class="sr-only">
      Pagos a la cuenta de apertura del mes
    </caption>
    <thead :class="cabecera">
      <tr>
        <th scope="col" class="px-3 py-2 text-left font-medium">Pago</th>
        <th scope="col" class="px-3 py-2 text-left font-medium">Proveedor</th>
        <th scope="col" class="px-3 py-2 text-right font-medium">Monto</th>
        <th scope="col" class="px-3 py-2 text-left font-medium">Motivo</th>
        <th scope="col" class="px-3 py-2 text-left font-medium">Carga</th>
        <th scope="col" class="px-3 py-2 text-left font-medium">Registró</th>
        <th scope="col" class="px-3 py-2 text-left font-medium">Estado</th>
      </tr>
    </thead>
    <tbody :class="cuerpo">
      <tr v-for="fila in pagosAApertura" :key="fila.id" class="align-top print:break-inside-avoid">
        <th scope="row" class="px-3 py-2 text-left font-normal whitespace-nowrap">
          N.º {{ fila.numeroDelPago }}
          <span class="block text-xs">{{ formatearFecha(fila.fecha) }}</span>
        </th>
        <td class="min-w-40 px-3 py-2">
          <EnlaceDeProveedorDelReporte :id="fila.proveedorId" :nombre="fila.proveedorNombre" />
        </td>
        <td class="px-3 py-2 text-right font-semibold tabular-nums">{{ formatearMonto(fila.monto) }}</td>
        <td class="min-w-40 px-3 py-2 text-xs">{{ formatearTexto(fila.motivo) }}</td>
        <td class="px-3 py-2 text-xs">{{ fila.conCargaCerrada ? 'Carga cerrada' : 'Carga abierta' }}</td>
        <td class="px-3 py-2 text-xs">{{ formatearTexto(fila.registro) }}</td>
        <td class="px-3 py-2 text-xs">
          <InsigniaBase v-if="fila.estado === 'anulado'" tono="rojo">Anulado</InsigniaBase>
          <template v-else>Vigente</template>
        </td>
      </tr>
    </tbody>
  </table>

  <table v-else-if="documentos" class="w-full text-sm print:text-[9px]">
    <caption class="sr-only">
      Documentos revertidos en el mes
    </caption>
    <thead :class="cabecera">
      <tr>
        <th scope="col" class="px-3 py-2 text-left font-medium">Documento</th>
        <th scope="col" class="px-3 py-2 text-left font-medium">Emisión</th>
        <th scope="col" class="px-3 py-2 text-right font-medium">Total</th>
        <th scope="col" class="px-3 py-2 text-left font-medium">Qué pasó</th>
        <th scope="col" class="px-3 py-2 text-left font-medium">Motivo</th>
        <th scope="col" class="px-3 py-2 text-left font-medium">Quién y cuándo</th>
      </tr>
    </thead>
    <tbody :class="cuerpo">
      <tr
        v-for="fila in documentos"
        :key="`${fila.documentoId}-${fila.cuando}`"
        class="align-top print:break-inside-avoid"
      >
        <th scope="row" class="min-w-44 px-3 py-2 text-left font-normal">
          {{ fila.documento }}
          <span class="block text-xs"
            ><EnlaceDeProveedorDelReporte :id="fila.proveedorId" :nombre="fila.proveedorNombre"
          /></span>
        </th>
        <td class="px-3 py-2 whitespace-nowrap">
          {{ formatearFecha(fila.emision) }}
          <InsigniaBase v-if="fila.deUnMesAnterior" tono="trigo" class="mt-1 block w-fit">Mes anterior</InsigniaBase>
          <span v-if="fila.marca" class="block text-xs whitespace-normal">{{ fila.marca }}</span>
        </td>
        <td class="px-3 py-2 text-right font-semibold tabular-nums">{{ formatearMonto(fila.total) }}</td>
        <td class="px-3 py-2 text-xs">{{ textoDeLaBaja(fila) }}</td>
        <td class="min-w-40 px-3 py-2 text-xs">{{ formatearTexto(fila.motivo) }}</td>
        <td class="px-3 py-2 text-xs">{{ formatearTexto(fila.quien) }} · {{ formatearFechaHora(fila.cuando) }}</td>
      </tr>
    </tbody>
  </table>
</template>
