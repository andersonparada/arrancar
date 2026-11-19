<script setup lang="ts">
import { CircleCheck } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { contarHallazgos, resumenDeCierre } from '../../composables/depreciacion/logica-de-cierre';
import type { RevisionDelCierre } from '../../servicios/depreciacion.api';
import ListaDeHallazgos from './ListaDeHallazgos.vue';

/**
 * La revisión de un mes antes de cerrarlo: lo que saldrá, lo que hay que saber y lo que impide cerrar. Cerrar solo
 * se ofrece si el servidor dice que se puede.
 */
defineProps<{
  abierta: boolean;
  titulo: string;
  revision: RevisionDelCierre | null;
  revisando: boolean;
  enviando: boolean;
}>();
const emit = defineEmits<{ cerrar: []; confirmar: [] }>();
</script>

<template>
  <VentanaModal :abierta="abierta" :titulo="titulo" ancha @cerrar="emit('cerrar')">
    <p v-if="revisando || !revision" class="text-sm text-tierra-500" role="status">Revisando el mes…</p>
    <div v-else class="space-y-4">
      <dl class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <dt class="text-xs text-tierra-500">Depreciación contable</dt>
          <dd class="text-lg font-semibold tabular-nums">{{ formatearMonto(revision.totales.contable) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-tierra-500">Depreciación fiscal</dt>
          <dd class="text-lg font-semibold tabular-nums">{{ formatearMonto(revision.totales.fiscal) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-tierra-500">Activos</dt>
          <dd class="text-lg font-semibold tabular-nums">{{ revision.totales.activosDepreciados }}</dd>
        </div>
      </dl>

      <ListaDeHallazgos v-if="revision.hallazgos.length" :hallazgos="revision.hallazgos" />
      <p v-else class="flex items-center gap-2 text-sm text-campo-800 dark:text-campo-300">
        <CircleCheck class="size-4" aria-hidden="true" /> Sin hallazgos: el mes está listo para cerrar.
      </p>

      <p v-if="revision.puedeCerrar" class="rounded-lg bg-tierra-100 p-3 text-sm dark:bg-tierra-800">
        {{ resumenDeCierre(revision) }} Después de cerrarlo solo se puede reabrir desde esta pantalla, con un motivo.
        <template v-if="contarHallazgos(revision.hallazgos).avisos"> Los avisos de arriba no impiden cerrar. </template>
      </p>
      <p v-else class="text-sm font-medium text-red-800 dark:text-red-300">
        Resuelva lo que impide cerrar y vuelva a abrir esta revisión.
      </p>
    </div>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase
        v-if="revision?.puedeCerrar"
        :cargando="enviando"
        :deshabilitado="revisando"
        @click="emit('confirmar')"
      >
        Cerrar el mes
      </BotonBase>
    </template>
  </VentanaModal>
</template>
