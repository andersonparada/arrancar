<script setup lang="ts">
import { Ban } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import { formatearFecha, formatearFechaHora, formatearMonto, formatearTexto } from '@/modulos/core/utilidades/formato';
import { numeroDeDocumento, resumenDeAnulados, textoDeCausaDeAnulacion } from '../../composables/libro/datos-del-libro';
import type { AnuladoDelLibro } from '../../servicios/libro.api';

/** El anexo del libro: lo anulado en el período no suma a los totales y solo se ve en pantalla. */
defineProps<{ anulados: AnuladoDelLibro[] }>();

const titulos = ['Fecha', 'Documento', 'Proveedor', 'NIT', 'Total', 'IVA', 'Causa', 'Motivo', 'Anulado'];
</script>

<template>
  <EstadoVacio
    v-if="anulados.length === 0"
    :icono="Ban"
    titulo="No hay documentos anulados en este período"
    descripcion="Cuando se anule una compra de este mes aparecerá aquí, con su causa y quién la anuló."
  />
  <div v-else>
    <p class="mb-2 text-sm text-tierra-600 dark:text-tierra-300" role="status">
      {{ resumenDeAnulados(anulados) }}. No suman a los totales del libro.
    </p>
    <div
      class="max-w-full overflow-x-auto rounded-2xl bg-white ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700"
      role="region"
      aria-label="Documentos anulados del período"
      tabindex="0"
    >
      <table class="w-full min-w-max border-collapse text-sm">
        <thead
          class="bg-tierra-100 text-left text-xs uppercase text-tierra-700 dark:bg-tierra-800 dark:text-tierra-200"
        >
          <tr>
            <th
              v-for="titulo in titulos"
              :key="titulo"
              scope="col"
              class="px-3 py-2 font-semibold"
              :class="titulo === 'Total' || titulo === 'IVA' ? 'text-right' : ''"
            >
              {{ titulo }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-tierra-100 dark:divide-tierra-700">
          <tr v-for="anulado in anulados" :key="anulado.id">
            <td class="whitespace-nowrap px-3 py-2">{{ formatearFecha(anulado.fechaEmision) }}</td>
            <td class="whitespace-nowrap px-3 py-2">
              <RouterLink
                :to="{ name: 'libro-de-compras.documentos.ficha', params: { documentoId: anulado.id } }"
                class="font-medium underline underline-offset-2"
              >
                {{ anulado.tipoDte ? `${anulado.tipoDte} ` : '' }}{{ numeroDeDocumento({ ...anulado }) }}
              </RouterLink>
            </td>
            <td class="min-w-48 px-3 py-2">{{ anulado.nombreDelProveedor }}</td>
            <td class="whitespace-nowrap px-3 py-2">{{ formatearTexto(anulado.nitDelProveedor) }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(anulado.total) }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ formatearMonto(anulado.iva) }}</td>
            <td class="px-3 py-2">{{ formatearTexto(textoDeCausaDeAnulacion(anulado.causaDeAnulacion)) }}</td>
            <td class="min-w-48 px-3 py-2">{{ formatearTexto(anulado.motivoDeAnulacion) }}</td>
            <td class="whitespace-nowrap px-3 py-2">
              {{ anulado.anuladoEn ? formatearFechaHora(anulado.anuladoEn) : '—' }}
              <span v-if="anulado.anuladoPor" class="block text-xs text-tierra-600 dark:text-tierra-300">{{
                anulado.anuladoPor
              }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
