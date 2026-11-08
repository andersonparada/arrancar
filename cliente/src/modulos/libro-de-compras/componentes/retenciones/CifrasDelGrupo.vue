<script setup lang="ts">
import { computed } from 'vue';
import { esCero } from '../../composables/retenciones/dinero';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { GrupoDelMes } from '../../servicios/retenciones.api';

/** Retenido, pagado y lo que falta (o sobra) de un grupo en un mes. */
const props = defineProps<{ grupo: GrupoDelMes }>();
const conAccesorios = computed(() => !esCero(props.grupo.accesorios));
const sobra = computed(() => props.grupo.diferencia.startsWith('-'));
</script>

<template>
  <div class="min-w-0">
    <dl class="grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-x-3 gap-y-2 text-sm">
      <div class="min-w-0">
        <dt class="text-xs text-tierra-600 dark:text-tierra-300">Retenido</dt>
        <dd class="font-semibold tabular-nums">{{ formatearMonto(grupo.retenido) }}</dd>
      </div>
      <div class="min-w-0">
        <dt class="text-xs text-tierra-600 dark:text-tierra-300">Impuesto pagado</dt>
        <dd class="font-semibold tabular-nums">{{ formatearMonto(grupo.pagado) }}</dd>
      </div>
      <div class="min-w-0">
        <dt class="text-xs text-tierra-600 dark:text-tierra-300">{{ sobra ? 'Pagado de más' : 'Falta pagar' }}</dt>
        <dd class="font-semibold tabular-nums">
          {{ formatearMonto(sobra ? grupo.diferencia.slice(1) : grupo.diferencia) }}
        </dd>
      </div>
    </dl>
    <p v-if="conAccesorios" class="mt-1 text-xs text-tierra-600 dark:text-tierra-300">
      Además pagó {{ formatearMonto(grupo.accesorios) }} de multa, intereses y mora.
    </p>
  </div>
</template>
