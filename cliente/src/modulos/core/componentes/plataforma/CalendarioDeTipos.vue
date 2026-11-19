<script setup lang="ts">
import { computed } from 'vue';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
import {
  encabezadosDeSemana,
  origenDelTipo,
  resumirMes,
  type DiaDelCalendario,
  type MesDelCalendario,
} from '../../composables/plataforma/calendario-de-tipos';
import { formatearTipoDeCambio } from '../../utilidades/formato';
import BotonBase from '../BotonBase.vue';
import InsigniaBase from '../InsigniaBase.vue';

const props = defineProps<{ mes: MesDelCalendario; nombre: string; moneda: string; puedeAvanzar: boolean }>();
const emit = defineEmits<{ mover: [meses: number]; elegir: [fecha: string] }>();

const resumen = computed(() => resumirMes(props.mes));
/** En el celular solo se listan los días que ya pasaron o que ya tienen tipo. */
const diasDeLaLista = computed(() => props.mes.dias.filter((dia) => !dia.futuro || dia.tipo));

function etiquetaDelDia(dia: DiaDelCalendario): string {
  const valor = dia.tipo
    ? `Q ${formatearTipoDeCambio(dia.tipo.referencia)} por unidad, ${origenDelTipo(dia.tipo)}`
    : 'sin tipo de cambio';
  return `Día ${dia.dia}: ${valor}. Abrir para ingresar o corregir.`;
}

const clasesDelDia = (dia: DiaDelCalendario) => [
  dia.esHoy ? 'ring-2 ring-campo-600' : 'ring-1 ring-tierra-200 dark:ring-tierra-700',
  dia.tipo ? 'bg-white dark:bg-tierra-800/60' : 'bg-tierra-50 text-tierra-500 dark:bg-tierra-900',
];
</script>

<template>
  <section aria-labelledby="titulo-calendario">
    <div class="mb-3 flex items-center justify-between gap-2">
      <BotonBase
        variante="secundario"
        pequeno
        :icono="ChevronLeft"
        aria-label="Mes anterior"
        @click="emit('mover', -1)"
      />
      <h2 id="titulo-calendario" class="text-center font-semibold" aria-live="polite">{{ moneda }} · {{ nombre }}</h2>
      <BotonBase
        variante="secundario"
        pequeno
        :icono="ChevronRight"
        :deshabilitado="!puedeAvanzar"
        aria-label="Mes siguiente"
        @click="emit('mover', 1)"
      />
    </div>

    <ul class="hidden grid-cols-7 gap-1 sm:grid" aria-label="Días del mes">
      <li
        v-for="semana in encabezadosDeSemana()"
        :key="semana"
        class="pb-1 text-center text-xs font-medium text-tierra-500 uppercase"
        aria-hidden="true"
      >
        {{ semana }}
      </li>
      <li v-for="n in mes.espaciosAlInicio" :key="`vacio-${n}`" aria-hidden="true" />
      <li v-for="dia in mes.dias" :key="dia.fecha">
        <button
          type="button"
          class="flex min-h-16 w-full flex-col items-start gap-0.5 rounded-lg p-1.5 text-left text-xs hover:bg-campo-50 focus-visible:outline-2 focus-visible:outline-campo-600 dark:hover:bg-tierra-700"
          :class="clasesDelDia(dia)"
          :aria-label="etiquetaDelDia(dia)"
          @click="emit('elegir', dia.fecha)"
        >
          <span class="font-semibold">{{ dia.dia }}</span>
          <span v-if="dia.tipo" class="tabular-nums">{{ formatearTipoDeCambio(dia.tipo.referencia) }}</span>
          <InsigniaBase v-if="dia.tipo?.origen === 'manual'" tono="trigo">Manual</InsigniaBase>
        </button>
      </li>
    </ul>

    <ul
      class="divide-y divide-tierra-100 rounded-2xl bg-white ring-1 ring-tierra-200/70 sm:hidden dark:divide-tierra-700 dark:bg-tierra-800/60 dark:ring-tierra-700"
      aria-label="Días del mes"
    >
      <li v-for="dia in diasDeLaLista" :key="dia.fecha">
        <button
          type="button"
          class="flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm focus-visible:outline-2 focus-visible:outline-campo-600"
          :aria-label="etiquetaDelDia(dia)"
          @click="emit('elegir', dia.fecha)"
        >
          <span :class="dia.esHoy ? 'font-semibold text-campo-800 dark:text-campo-300' : ''">
            {{ encabezadosDeSemana()[dia.semana] }} {{ dia.dia }}
          </span>
          <span v-if="dia.tipo" class="flex items-center gap-2 tabular-nums">
            {{ formatearTipoDeCambio(dia.tipo.referencia) }}
            <InsigniaBase :tono="dia.tipo.origen === 'manual' ? 'trigo' : 'tierra'">{{
              origenDelTipo(dia.tipo)
            }}</InsigniaBase>
          </span>
          <span v-else class="text-tierra-500">{{ dia.finDeSemana ? 'Fin de semana' : 'Sin tipo' }}</span>
        </button>
      </li>
    </ul>

    <p class="mt-3 text-sm text-tierra-600 dark:text-tierra-300">
      {{ resumen.conTipo }} {{ resumen.conTipo === 1 ? 'día con tipo' : 'días con tipo' }} ({{ resumen.manuales }} a
      mano).
      <template v-if="resumen.sinTipoEntreSemana">
        {{ resumen.sinTipoEntreSemana }}
        {{ resumen.sinTipoEntreSemana === 1 ? 'día hábil sin tipo' : 'días hábiles sin tipo' }}: las monedas que no son
        el dólar no se publican en fines de semana ni asuetos.
      </template>
      Toque un día para ingresar o corregir su valor. Fuente: Banco de Guatemala.
    </p>
  </section>
</template>
