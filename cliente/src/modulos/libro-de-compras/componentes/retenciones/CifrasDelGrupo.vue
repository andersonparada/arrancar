<script setup lang="ts">
import { computed } from 'vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { GrupoDelMes } from '../../servicios/retenciones.api';

/** Retenido, pagado y lo que falta (o sobra) de un grupo en un mes. */
const props = defineProps<{ grupo: GrupoDelMes }>();
const sobra = computed(() => props.grupo.diferencia.startsWith('-'));
</script>

<template>
  <dl class="grid grid-cols-3 gap-2 text-sm">
    <div>
      <dt class="text-xs text-tierra-600 dark:text-tierra-300">Retenido</dt>
      <dd class="font-semibold tabular-nums">{{ formatearMonto(grupo.retenido) }}</dd>
    </div>
    <div>
      <dt class="text-xs text-tierra-600 dark:text-tierra-300">Pagado</dt>
      <dd class="font-semibold tabular-nums">{{ formatearMonto(grupo.pagado) }}</dd>
    </div>
    <div>
      <dt class="text-xs text-tierra-600 dark:text-tierra-300">{{ sobra ? 'Pagado de más' : 'Falta pagar' }}</dt>
      <dd class="font-semibold tabular-nums">
        {{ formatearMonto(sobra ? grupo.diferencia.slice(1) : grupo.diferencia) }}
      </dd>
    </div>
  </dl>
</template>
