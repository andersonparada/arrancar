<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import {
  detallesDePartida,
  montoConSigno,
  tituloDePartida,
} from '../../composables/saldos-iniciales/detalles-de-partida';
import { insigniasDePartida } from '../../composables/saldos-iniciales/grupos-de-partidas';
import type { PartidaDeApertura } from '../../servicios/tipos-de-saldos-iniciales';

/**
 * Una partida de la ficha: título, monto, datos, insignias y los textos de sus avisos. Los botones salen según lo
 * que el servidor dice que se puede (`puedeCorregir`, `puedeEliminar`, `puedeAnular`) y el permiso del usuario.
 */
const props = defineProps<{ partida: PartidaDeApertura; avisos: string[] }>();
const emit = defineEmits<{ corregir: []; eliminar: []; anular: [] }>();
const insignias = computed(() => insigniasDePartida(props.partida));
const tachada = computed(() => props.partida.anulada || props.partida.revertida);
</script>

<template>
  <div class="space-y-1.5 py-3">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p
          class="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium"
          :class="tachada ? 'line-through opacity-70' : ''"
        >
          <span class="break-words">{{ tituloDePartida(partida) }}</span>
          <InsigniaBase v-for="insignia in insignias" :key="insignia.clave" :tono="insignia.tono">
            {{ insignia.texto }}
          </InsigniaBase>
        </p>
        <dl class="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-tierra-600 dark:text-tierra-300">
          <div v-for="detalle in detallesDePartida(partida)" :key="detalle.etiqueta" class="min-w-0">
            <dt class="inline text-xs text-tierra-500">{{ detalle.etiqueta }}:</dt>
            <dd class="inline break-words">{{ detalle.valor }}</dd>
          </div>
        </dl>
      </div>
      <p class="shrink-0 font-semibold tabular-nums" :class="tachada ? 'line-through opacity-70' : ''">
        {{ montoConSigno(partida) }}
      </p>
    </div>
    <p
      v-for="aviso in avisos"
      :key="aviso"
      class="rounded-md bg-trigo-300/40 px-2.5 py-1.5 text-xs text-tierra-800 dark:bg-trigo-500/20 dark:text-trigo-300"
      role="note"
    >
      {{ aviso }}
    </p>
    <div v-if="partida.puedeCorregir || partida.puedeEliminar || partida.puedeAnular" class="flex flex-wrap gap-1">
      <span v-if="partida.puedeCorregir" v-permiso="'bancos.saldos-iniciales.editar'" class="contents">
        <BotonBase variante="fantasma" pequeno @click="emit('corregir')">Corregir</BotonBase>
      </span>
      <span v-if="partida.puedeEliminar" v-permiso="'bancos.saldos-iniciales.eliminar'" class="contents">
        <BotonBase variante="fantasma" pequeno @click="emit('eliminar')">Eliminar</BotonBase>
      </span>
      <span v-if="partida.puedeAnular" v-permiso="'bancos.saldos-iniciales.anular'" class="contents">
        <BotonBase variante="fantasma" pequeno @click="emit('anular')">Anular</BotonBase>
      </span>
    </div>
  </div>
</template>
