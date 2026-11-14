<script setup lang="ts">
import { computed } from 'vue';
import { ChevronRight } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { textoDeEstado, tituloDeDocumento, tonoDeEstado } from '../composables/detalles-de-documento';
import { detallesDeNota } from '../composables/notas-de-credito';
import type { DocumentoPorPagar } from '../servicios/tipos';

/** Una nota de crédito de la lista: lo que se aplicó, lo que se dio de baja y lo que queda libre. Lleva a su ficha. */
const props = defineProps<{ nota: DocumentoPorPagar }>();
const destino = computed(() => ({
  name: 'cuentas-por-pagar.documentos.ficha',
  params: { documentoId: props.nota.id },
}));
</script>

<template>
  <TarjetaBase class="h-full" :class="nota.estado === 'anulado' ? 'opacity-80' : ''">
    <RouterLink
      :to="destino"
      class="flex h-full min-w-0 flex-col gap-3 rounded-lg focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none"
    >
      <span class="flex items-start justify-between gap-2">
        <span class="min-w-0">
          <span class="block truncate font-semibold">{{ tituloDeDocumento(nota) }}</span>
          <span class="block truncate text-sm text-tierra-600 dark:text-tierra-300">{{ nota.proveedorNombre }}</span>
        </span>
        <ChevronRight class="size-4 shrink-0 text-tierra-400" aria-hidden="true" />
      </span>
      <span class="flex flex-wrap gap-1.5">
        <InsigniaBase :tono="tonoDeEstado(nota.estado)">{{ textoDeEstado(nota.estado) }}</InsigniaBase>
        <InsigniaBase v-if="nota.origen === 'saldo_inicial'" tono="tierra">Saldo inicial</InsigniaBase>
        <InsigniaBase v-if="nota.puedeAplicar" tono="campo">Se puede aplicar</InsigniaBase>
      </span>
      <p class="text-sm text-tierra-600 dark:text-tierra-300">Emitida el {{ formatearFecha(nota.fechaEmision) }}</p>
      <dl class="grid grid-cols-3 gap-x-3 gap-y-1.5 text-sm">
        <div v-for="detalle in detallesDeNota(nota)" :key="detalle.clave" class="min-w-0">
          <dt class="text-xs text-tierra-500">{{ detalle.etiqueta }}</dt>
          <dd class="truncate">{{ formatearMonto(detalle.monto) }}</dd>
        </div>
      </dl>
      <p
        class="mt-auto flex items-baseline justify-between gap-2 border-t border-tierra-200 pt-2 dark:border-tierra-700"
      >
        <span class="text-sm text-tierra-600 dark:text-tierra-300">Saldo a favor</span>
        <span class="text-lg font-semibold text-campo-700 dark:text-campo-300">{{ formatearMonto(nota.saldo) }}</span>
      </p>
    </RouterLink>
  </TarjetaBase>
</template>
