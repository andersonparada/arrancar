<script setup lang="ts">
import { History } from 'lucide-vue-next';
import {
  lineasDelDetalle,
  nombreDeLaVuelta,
  quehacerConElResultado,
  resultadoDeLaConsulta,
  resumenDeLaConsulta,
} from '../../composables/plataforma/bitacora-del-banguat';
import type { ConsultaDeLaCarga } from '../../servicios/tipos-de-cambio.api';
import { formatearFecha, formatearFechaHora } from '../../utilidades/formato';
import EstadoVacio from '../EstadoVacio.vue';
import InsigniaBase from '../InsigniaBase.vue';

defineProps<{ consultas: ConsultaDeLaCarga[] }>();
</script>

<template>
  <EstadoVacio
    v-if="!consultas.length"
    :icono="History"
    titulo="Todavía no hay cargas"
    descripcion="Cada llamada al Banguat (de las vueltas automáticas o hecha a pedido) queda aquí."
  />
  <ol
    v-else
    class="divide-y divide-tierra-100 rounded-2xl bg-white ring-1 ring-tierra-200/70 dark:divide-tierra-700 dark:bg-tierra-800/60 dark:ring-tierra-700"
  >
    <li v-for="consulta in consultas" :key="consulta.id" class="space-y-1 px-4 py-3 text-sm">
      <p class="flex flex-wrap items-center gap-2">
        <InsigniaBase :tono="resultadoDeLaConsulta(consulta.resultado).tono">
          {{ resultadoDeLaConsulta(consulta.resultado).texto }}
        </InsigniaBase>
        <span class="font-medium">{{ resumenDeLaConsulta(consulta, formatearFecha) }}</span>
        <InsigniaBase v-if="consulta.aPedido" tono="trigo">A pedido</InsigniaBase>
      </p>
      <p class="text-xs text-tierra-600 dark:text-tierra-300">
        {{ formatearFechaHora(consulta.iniciadaEn) }} · {{ nombreDeLaVuelta(consulta.vuelta) }} ·
        {{ consulta.filasNuevas }} nuevos<template v-if="consulta.filasRechazadas">
          , {{ consulta.filasRechazadas }} rechazados</template
        >
      </p>
      <p v-if="quehacerConElResultado(consulta.resultado)" class="text-xs text-tierra-600 dark:text-tierra-300">
        {{ quehacerConElResultado(consulta.resultado) }}
      </p>
      <ul v-if="consulta.detalle" class="text-xs wrap-break-word text-tierra-700 dark:text-tierra-200">
        <li v-for="linea in lineasDelDetalle(consulta.detalle, formatearFecha)" :key="linea">{{ linea }}</li>
      </ul>
    </li>
  </ol>
</template>
