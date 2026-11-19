<script setup lang="ts">
import { ExternalLink, ShieldAlert } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { razonDeNoMarcar, sePuedeMarcar } from '../composables/comprobantes/armado-de-asignacion';
import { detallesDeLaBandeja, tituloDeComprobante } from '../composables/comprobantes/detalles-de-comprobante';
import type { ComprobanteDeLaBandeja } from '../servicios/tipos-de-comprobantes';
import MarcasDelComprobante from './MarcasDelComprobante.vue';

/**
 * Un documento de la bandeja con su casilla. Una factura con retención solo se marca con el permiso de excepción; sin
 * él se ve, pero se explica por qué no se puede marcar.
 */
const props = defineProps<{ documento: ComprobanteDeLaBandeja; marcado: boolean }>();
const emit = defineEmits<{ alternar: [] }>();
const puedeVerElLibro = usarSesion().puede('libro-de-compras.documentos.ver');
const enlaceAlLibro = {
  name: 'libro-de-compras.documentos.ficha',
  params: { documentoId: props.documento.documentoDeCompraId ?? '' },
};
</script>

<template>
  <TarjetaBase class="flex h-full flex-col gap-3" :class="marcado ? 'ring-2 ring-campo-500' : ''">
    <label class="flex items-start gap-3" :class="sePuedeMarcar(documento) ? 'cursor-pointer' : 'cursor-not-allowed'">
      <input
        type="checkbox"
        class="mt-1 size-5 rounded border-tierra-300 text-campo-600 focus:ring-campo-500 disabled:opacity-40"
        :checked="marcado"
        :disabled="!sePuedeMarcar(documento)"
        :aria-label="`Escoger ${tituloDeComprobante(documento)}`"
        @change="emit('alternar')"
      />
      <span class="min-w-0 flex-1">
        <span class="block truncate font-semibold">{{ tituloDeComprobante(documento) }}</span>
        <span class="block truncate text-sm text-tierra-600 dark:text-tierra-300">
          {{ documento.documento?.proveedorNombre }}
        </span>
      </span>
    </label>
    <MarcasDelComprobante :comprobante="documento" />
    <dl class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
      <div v-for="detalle in detallesDeLaBandeja(documento)" :key="detalle.etiqueta" class="min-w-0">
        <dt class="text-xs text-tierra-500">{{ detalle.etiqueta }}</dt>
        <dd class="break-words">{{ detalle.valor }}</dd>
      </div>
    </dl>
    <p v-if="razonDeNoMarcar(documento)" class="flex gap-1.5 text-sm text-tierra-700 dark:text-trigo-300" role="note">
      <ShieldAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {{ razonDeNoMarcar(documento) }}
    </p>
    <RouterLink
      v-if="puedeVerElLibro && documento.documentoDeCompraId"
      :to="enlaceAlLibro"
      class="mt-auto inline-flex items-center gap-1.5 self-start text-sm font-medium text-campo-700 underline dark:text-campo-300"
    >
      <ExternalLink class="size-4" aria-hidden="true" />
      Ver en el libro de compras
    </RouterLink>
  </TarjetaBase>
</template>
