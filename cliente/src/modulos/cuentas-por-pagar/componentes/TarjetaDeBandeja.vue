<script setup lang="ts">
import { ExternalLink } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { formatearFecha } from '@/modulos/core/utilidades/formato';
import { detallesDeBandeja, tituloDeDocumento } from '../composables/detalles-de-documento';
import type { DocumentoPorPagar } from '../servicios/tipos';

/**
 * Un documento pendiente: la casilla (si el usuario puede completar), sus datos y el vencimiento propuesto, que se puede
 * cambiar antes de completar. Una nota de crédito no vence, así que no lleva fecha.
 */
const props = defineProps<{ documento: DocumentoPorPagar; marcado: boolean; puedeMarcar: boolean; error?: string }>();
const vencimiento = defineModel<string>('vencimiento', { default: '' });
const emit = defineEmits<{ alternar: [] }>();
const puedeVerElLibro = usarSesion().puede('libro-de-compras.documentos.ver');
const enlaceALaFicha = {
  name: 'libro-de-compras.documentos.ficha',
  params: { documentoId: props.documento.documentoId },
};
</script>

<template>
  <TarjetaBase class="flex h-full flex-col gap-3" :class="marcado ? 'ring-2 ring-campo-500' : ''">
    <label class="flex cursor-pointer items-start gap-3">
      <input
        v-if="puedeMarcar"
        type="checkbox"
        class="mt-1 size-5 rounded border-tierra-300 text-campo-600 focus:ring-campo-500"
        :checked="marcado"
        :aria-label="`Escoger ${tituloDeDocumento(documento)}`"
        @change="emit('alternar')"
      />
      <span class="min-w-0 flex-1">
        <span class="block truncate font-semibold">{{ tituloDeDocumento(documento) }}</span>
        <span class="block truncate text-sm text-tierra-600 dark:text-tierra-300">{{ documento.proveedorNombre }}</span>
      </span>
      <InsigniaBase v-if="documento.clase === 'abono'" tono="campo">A favor</InsigniaBase>
    </label>
    <dl class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
      <div v-for="detalle in detallesDeBandeja(documento)" :key="detalle.etiqueta" class="min-w-0">
        <dt class="text-xs text-tierra-500">{{ detalle.etiqueta }}</dt>
        <dd class="truncate">{{ detalle.valor }}</dd>
      </div>
    </dl>
    <CampoTexto
      v-if="documento.clase === 'cargo' && puedeMarcar"
      v-model="vencimiento"
      etiqueta="Vence"
      tipo="date"
      requerido
      :error="error"
    />
    <p v-else-if="documento.clase === 'cargo'" class="text-sm">
      <span class="text-xs text-tierra-500">Vence</span>
      {{ formatearFecha(vencimiento) }}
    </p>
    <p v-else class="text-xs text-tierra-500">
      Una nota de crédito no vence: rebaja lo que se debe desde que se recibió.
    </p>
    <RouterLink
      v-if="puedeVerElLibro"
      :to="enlaceALaFicha"
      class="mt-auto inline-flex items-center gap-1.5 self-start text-sm font-medium text-campo-700 underline dark:text-campo-300"
    >
      <ExternalLink class="size-4" aria-hidden="true" />
      Ver en el libro de compras
    </RouterLink>
  </TarjetaBase>
</template>
