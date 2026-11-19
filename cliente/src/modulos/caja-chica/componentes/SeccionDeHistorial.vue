<script setup lang="ts">
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import type { CambioDeMonto, CustodioDelFondo } from '../servicios/tipos-de-fondos';
import { FORMAS_DE_CAMBIO_DE_MONTO, TIPOS_DE_CAMBIO_DE_MONTO } from '../textos';

/** El historial del fondo: quién lo ha custodiado y cada vez que cambió su monto. Plegado: es consulta, no tarea diaria. */
defineProps<{ custodios: CustodioDelFondo[]; cambios: CambioDeMonto[] }>();
</script>

<template>
  <details class="group rounded-2xl">
    <summary
      class="cursor-pointer rounded-2xl px-1 py-2 text-lg font-semibold focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none"
    >
      Historial del fondo
    </summary>
    <div class="grid grid-cols-1 gap-3 pt-2 lg:grid-cols-2">
      <TarjetaBase>
        <h3 class="mb-2 font-semibold">Custodios</h3>
        <ul class="space-y-2 text-sm">
          <li v-for="custodio in custodios" :key="`${custodio.desde}-${custodio.custodio}`">
            <span class="font-medium">{{ custodio.custodio }}</span>
            <span class="text-tierra-600 dark:text-tierra-300">
              · desde {{ formatearFecha(custodio.desde) }}
              <template v-if="custodio.hasta">hasta {{ formatearFecha(custodio.hasta) }}</template>
              <InsigniaBase v-else tono="campo" class="ml-1">Actual</InsigniaBase>
            </span>
            <span v-if="custodio.motivoDelCambio" class="block text-tierra-500">{{ custodio.motivoDelCambio }}</span>
          </li>
        </ul>
      </TarjetaBase>
      <TarjetaBase>
        <h3 class="mb-2 font-semibold">Cambios de monto</h3>
        <ul class="space-y-2 text-sm">
          <li v-for="cambio in cambios" :key="cambio.id" :class="cambio.estado === 'anulado' ? 'opacity-60' : ''">
            <span class="font-medium">{{ TIPOS_DE_CAMBIO_DE_MONTO[cambio.tipo] }}</span>
            <span class="tabular-nums"> {{ formatearMonto(cambio.monto) }}</span>
            <span class="text-tierra-600 dark:text-tierra-300">
              · {{ formatearFecha(cambio.fecha) }} · {{ FORMAS_DE_CAMBIO_DE_MONTO[cambio.forma] }}
            </span>
            <InsigniaBase v-if="cambio.estado === 'anulado'" tono="rojo" class="ml-1">Anulado</InsigniaBase>
            <span v-if="cambio.motivoDeAnulacion" class="block text-tierra-500">{{ cambio.motivoDeAnulacion }}</span>
          </li>
        </ul>
      </TarjetaBase>
    </div>
  </details>
</template>
