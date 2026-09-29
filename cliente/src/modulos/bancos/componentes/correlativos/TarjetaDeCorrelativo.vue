<script setup lang="ts">
import { computed } from 'vue';
import { CircleCheck } from 'lucide-vue-next';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import {
  contarHuecos,
  estadoDelCorrelativo,
  tituloDeCorrelativo,
} from '../../composables/correlativos/resumen-de-correlativos';
import type { Correlativo } from '../../servicios/correlativos.api';
import HuecoDelCorrelativo from './HuecoDelCorrelativo.vue';

/**
 * Un correlativo (y su año, si se reinicia): último número, cuántos siguen en uso y sus huecos. Los huecos
 * sin rastro en la auditoría van resaltados; sin huecos, dice que la numeración está completa.
 */
const props = defineProps<{ correlativo: Correlativo }>();

const estado = computed(() => estadoDelCorrelativo(props.correlativo));
const cuenta = computed(() => contarHuecos(props.correlativo));
const INSIGNIA = { completo: 'campo', explicado: 'trigo', alerta: 'rojo' } as const;
const TEXTO = { completo: 'Completo', explicado: 'Con huecos explicados', alerta: 'Hueco sin auditoría' } as const;
</script>

<template>
  <TarjetaBase class="break-inside-avoid space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="font-semibold">{{ tituloDeCorrelativo(correlativo) }}</h2>
      <InsigniaBase :tono="INSIGNIA[estado]">{{ TEXTO[estado] }}</InsigniaBase>
    </div>
    <dl class="grid grid-cols-3 gap-3 text-sm">
      <div>
        <dt class="text-xs text-tierra-500">Último número</dt>
        <dd class="font-medium">{{ correlativo.ultimo }}</dd>
      </div>
      <div>
        <dt class="text-xs text-tierra-500">Emitidos</dt>
        <dd class="font-medium">{{ correlativo.emitidos }}</dd>
      </div>
      <div>
        <dt class="text-xs text-tierra-500">Huecos</dt>
        <dd class="font-medium" :class="cuenta.alertas ? 'text-red-700 dark:text-red-400' : ''">
          {{ cuenta.huecos }}
        </dd>
      </div>
    </dl>
    <ul
      v-if="correlativo.huecos.length"
      class="space-y-2"
      :aria-label="`Huecos de ${tituloDeCorrelativo(correlativo)}`"
    >
      <HuecoDelCorrelativo v-for="hueco in correlativo.huecos" :key="hueco.numero" :hueco="hueco" />
    </ul>
    <p v-else class="flex items-center gap-2 text-sm text-campo-700 dark:text-campo-400">
      <CircleCheck class="size-4" aria-hidden="true" />
      Sin huecos: la numeración está completa.
    </p>
  </TarjetaBase>
</template>
