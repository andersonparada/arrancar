<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import { faltaParaTerminar } from '../../composables/conciliaciones/comparacion-de-saldo';
import type { Conciliacion } from '../../servicios/conciliaciones.api';

/** Terminar, Devolver y Autorizar según el estado; Terminar queda deshabilitado con la lista de lo que falta. */
const props = defineProps<{ conciliacion: Conciliacion; guardando?: boolean }>();
defineEmits<{ terminar: []; devolver: []; autorizar: [] }>();

const faltante = computed(() => faltaParaTerminar(props.conciliacion));
const enProceso = computed(() => props.conciliacion.estado === 'en_proceso');
const elaborada = computed(() => props.conciliacion.estado === 'elaborada');
</script>

<template>
  <div class="space-y-2 print:hidden">
    <div class="flex flex-wrap justify-end gap-2">
      <BotonBase
        v-if="enProceso"
        v-permiso="'bancos.conciliaciones.conciliar'"
        :cargando="guardando"
        :deshabilitado="faltante.length > 0"
        aria-describedby="falta-para-terminar"
        @click="$emit('terminar')"
      >
        Terminar
      </BotonBase>
      <template v-if="elaborada">
        <BotonBase v-permiso="'bancos.conciliaciones.autorizar'" variante="secundario" @click="$emit('devolver')">
          Devolver
        </BotonBase>
        <BotonBase
          v-if="!conciliacion.previaAlSaldoTranscrito"
          v-permiso="'bancos.conciliaciones.autorizar'"
          :cargando="guardando"
          @click="$emit('autorizar')"
        >
          Autorizar
        </BotonBase>
      </template>
    </div>
    <ul
      v-if="enProceso && faltante.length > 0"
      id="falta-para-terminar"
      v-permiso="'bancos.conciliaciones.conciliar'"
      class="list-disc space-y-0.5 pl-5 text-sm text-tierra-600 dark:text-tierra-300"
    >
      <li class="list-none font-medium">Para terminar falta:</li>
      <li v-for="motivo in faltante" :key="motivo">{{ motivo }}</li>
    </ul>
  </div>
</template>
