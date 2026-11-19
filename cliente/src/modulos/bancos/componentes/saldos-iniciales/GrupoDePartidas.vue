<script setup lang="ts">
import { Plus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { textoDelAvisoDeLaFicha } from '../../composables/saldos-iniciales/avisos-de-partida';
import type { GrupoDePartidas } from '../../composables/saldos-iniciales/grupos-de-partidas';
import type { PartidaDeApertura } from '../../servicios/tipos-de-saldos-iniciales';
import FilaDePartida from './FilaDePartida.vue';

/**
 * Un grupo de partidas de la ficha (cheques en circulación, depósitos, débitos, errores del banco o posfechados):
 * su ayuda, su total y «Agregar». Siempre se muestra, también vacío, para poder agregar la primera partida.
 */
const props = defineProps<{ grupo: GrupoDePartidas; corte: string | null; ayuda: string; puedeAgregar: boolean }>();
const emit = defineEmits<{
  agregar: [];
  corregir: [partida: PartidaDeApertura];
  eliminar: [partida: PartidaDeApertura];
  anular: [partida: PartidaDeApertura];
}>();

const avisosDe = (partida: PartidaDeApertura): string[] =>
  props.corte === null
    ? []
    : partida.avisos.map((aviso) =>
        textoDelAvisoDeLaFicha(aviso, partida, { corte: props.corte!, dar: formatearFecha }),
      );
</script>

<template>
  <TarjetaBase :aria-label="grupo.titulo" role="region">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div class="min-w-0">
        <h3 class="font-semibold">{{ grupo.titulo }}</h3>
        <p class="mt-0.5 text-xs text-tierra-500">{{ ayuda }}</p>
      </div>
      <div class="flex items-center gap-3">
        <p class="font-semibold tabular-nums">{{ formatearMonto(grupo.total) }}</p>
        <span v-if="puedeAgregar" v-permiso="'bancos.saldos-iniciales.crear'" class="contents">
          <BotonBase variante="secundario" pequeno :icono="Plus" @click="emit('agregar')">{{
            grupo.agregar
          }}</BotonBase>
        </span>
      </div>
    </div>
    <ul v-if="grupo.partidas.length" class="mt-2 divide-y divide-tierra-200 dark:divide-tierra-700">
      <li v-for="partida in grupo.partidas" :key="partida.movimientoId">
        <FilaDePartida
          :partida="partida"
          :avisos="avisosDe(partida)"
          @corregir="emit('corregir', partida)"
          @eliminar="emit('eliminar', partida)"
          @anular="emit('anular', partida)"
        />
      </li>
    </ul>
    <p v-else class="mt-2 text-sm text-tierra-500">Ninguna.</p>
  </TarjetaBase>
</template>
