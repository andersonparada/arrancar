<script setup lang="ts">
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import {
  cifrasDeRetencion,
  estadoDeRetencion,
  nombreDeRetencion,
} from '../../composables/documentos/detalles-de-retencion';
import type { RetencionDeDocumento } from '../../servicios/documentos.api';

defineProps<{ retenciones: RetencionDeDocumento[] }>();
</script>

<template>
  <p v-if="retenciones.length === 0" class="text-sm text-tierra-600 dark:text-tierra-300">
    No se practicó ninguna retención en este documento.
  </p>
  <ul v-else class="space-y-3">
    <li v-for="(retencion, indice) in retenciones" :key="indice">
      <TarjetaBase>
        <div class="flex flex-wrap items-start justify-between gap-2">
          <p class="min-w-0 font-medium">{{ nombreDeRetencion(retencion) }}</p>
          <InsigniaBase v-if="estadoDeRetencion(retencion)" tono="trigo">{{
            estadoDeRetencion(retencion)
          }}</InsigniaBase>
        </div>
        <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-5">
          <div v-for="cifra in cifrasDeRetencion(retencion)" :key="cifra.etiqueta" class="min-w-0">
            <dt class="text-xs text-tierra-500">{{ cifra.etiqueta }}</dt>
            <dd class="tabular-nums">{{ cifra.valor }}</dd>
          </div>
        </dl>
        <p v-if="retencion.motivoDelAjuste" class="mt-3 text-sm">
          <span class="text-tierra-500">Motivo del ajuste:</span> {{ retencion.motivoDelAjuste }}
        </p>
      </TarjetaBase>
    </li>
  </ul>
</template>
