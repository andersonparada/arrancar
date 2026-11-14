<script setup lang="ts">
import { computed } from 'vue';
import { Info } from 'lucide-vue-next';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { etiquetaDeDocumento, type TotalesDeLaContrasena } from '../composables/contrasenas/edicion-de-contrasena';
import type { NotaDisponible } from '../servicios/tipos-de-contrasenas';
import { avisoDeBancarizacionDeLaContrasena } from '../textos';

/** Los totales de lo marcado, que se recalculan al marcar, y el aviso de bancarización si una nota compensa una factura grande. */
const props = defineProps<{ totales: TotalesDeLaContrasena; cantidad: number; notasConAviso: NotaDisponible[] }>();
const textoDelAviso = computed(() =>
  avisoDeBancarizacionDeLaContrasena(props.notasConAviso.map(etiquetaDeDocumento).join(', ')),
);
</script>

<template>
  <div class="space-y-3" aria-live="polite">
    <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
      <div>
        <dt class="text-xs text-tierra-500">Documentos</dt>
        <dd>{{ cantidad }}</dd>
      </div>
      <div>
        <dt class="text-xs text-tierra-500">Total de las facturas</dt>
        <dd>{{ formatearMonto(totales.total) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-tierra-500">Notas aplicadas</dt>
        <dd>− {{ formatearMonto(totales.notasAplicadas) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-tierra-500">Retenciones</dt>
        <dd>{{ formatearMonto(totales.retenciones) }}</dd>
      </div>
    </dl>
    <p class="flex items-baseline justify-between gap-2 border-t border-tierra-200 pt-2 dark:border-tierra-700">
      <span class="text-sm text-tierra-600 dark:text-tierra-300">Saldo por pagar</span>
      <span class="text-xl font-semibold text-campo-700 dark:text-campo-300">{{ formatearMonto(totales.saldo) }}</span>
    </p>
    <p
      v-if="notasConAviso.length > 0"
      class="flex gap-2 rounded-lg bg-trigo-300/40 p-3 text-sm text-tierra-800 dark:bg-trigo-500/20 dark:text-trigo-300"
      role="note"
    >
      <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {{ textoDelAviso }}
    </p>
  </div>
</template>
