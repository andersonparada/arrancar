<script setup lang="ts">
import { RouterLink } from 'vue-router';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import {
  esDinero,
  etiquetaDeCifra,
  nombreDelDocumentoCambiado,
  ordenarCambios,
  sentidoDelCambio,
  textoDelCambioDeDocumento,
} from '../../composables/periodos/datos-de-cambios';
import type { CambioDesdeLaDeclaracion } from '../../servicios/periodos.api';
import { DETALLE_DE_PERIODO as textos } from '../../textos-de-periodos';

/**
 * Lo que cambió el libro después de la última declaración: las cifras y las facturas registradas o anuladas. Es lo
 * que se corrige al rectificar.
 */
defineProps<{ cambio: CambioDesdeLaDeclaracion }>();

const mostrar = (valor: string) => (esDinero(valor) ? formatearMonto(valor) : valor);
const COLOR = { sube: 'text-campo-800 dark:text-campo-300', baja: 'text-red-700 dark:text-red-400', igual: '' };
</script>

<template>
  <div class="space-y-4">
    <p v-if="cambio.cambios.length === 0 && cambio.documentos.length === 0 && !cambio.huellaCambio" class="text-sm">
      {{ textos.sinCambios }}
    </p>
    <template v-else>
      <div v-if="cambio.cambios.length > 0" class="overflow-x-auto">
        <table class="w-full min-w-[28rem] text-sm">
          <caption class="sr-only">
            {{
              textos.cambios
            }}
          </caption>
          <thead class="text-left text-xs text-tierra-500">
            <tr>
              <th scope="col" class="py-1 pr-3 font-medium">Cifra</th>
              <th scope="col" class="px-3 py-1 text-right font-medium">Declarado</th>
              <th scope="col" class="px-3 py-1 text-right font-medium">Hoy</th>
              <th scope="col" class="py-1 pl-3 text-right font-medium">Cambio</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-tierra-200 dark:divide-tierra-700">
            <tr v-for="fila in ordenarCambios(cambio.cambios)" :key="fila.clave">
              <th scope="row" class="py-1.5 pr-3 text-left font-normal">{{ etiquetaDeCifra(fila.clave) }}</th>
              <td class="px-3 py-1.5 text-right tabular-nums">{{ mostrar(fila.anterior) }}</td>
              <td class="px-3 py-1.5 text-right tabular-nums">{{ mostrar(fila.actual) }}</td>
              <td class="py-1.5 pl-3 text-right font-medium tabular-nums" :class="COLOR[sentidoDelCambio(fila.cambio)]">
                {{ Number(fila.cambio) > 0 ? '+' : '' }}{{ mostrar(fila.cambio) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="cambio.huellaCambio && cambio.documentos.length === 0" class="text-sm">{{ textos.cambioDeHuella }}</p>
      <div v-if="cambio.documentos.length > 0">
        <h3 class="mb-2 text-sm font-semibold">{{ textos.documentos }}</h3>
        <ul class="divide-y divide-tierra-200 text-sm dark:divide-tierra-700">
          <li v-for="documento in cambio.documentos" :key="documento.documentoId + documento.cambio">
            <RouterLink
              :to="{ name: 'libro-de-compras.documentos.ficha', params: { documentoId: documento.documentoId } }"
              class="flex flex-wrap items-center justify-between gap-2 py-2 hover:text-campo-700 dark:hover:text-campo-300"
            >
              <span class="flex min-w-0 items-center gap-2">
                <InsigniaBase :tono="documento.cambio === 'anulado' ? 'rojo' : 'campo'">
                  {{ textoDelCambioDeDocumento(documento) }}
                </InsigniaBase>
                <span class="break-all">{{ nombreDelDocumentoCambiado(documento) }}</span>
              </span>
              <span class="tabular-nums">{{ formatearMonto(documento.total) }}</span>
            </RouterLink>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>
