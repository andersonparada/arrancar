<script setup lang="ts">
import { computed } from 'vue';
import { ChevronRight } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { detallesDeLista, textoDeEstado, tituloDeDocumento, tonoDeEstado } from '../composables/detalles-de-documento';
import type { DocumentoPorPagar } from '../servicios/tipos';

/**
 * Un documento de la lista: lleva a su ficha. La casilla (para autorizar en lote) va aparte del enlace, para que
 * marcar no abra la ficha. `esperaAOtraPersona` explica por qué no hay casilla en lo que el usuario ingresó o completó.
 */
const props = defineProps<{
  documento: DocumentoPorPagar;
  puedeMarcar: boolean;
  marcado: boolean;
  esperaAOtraPersona: boolean;
}>();
defineEmits<{ alternar: [] }>();
const destino = computed(() => ({
  name: 'cuentas-por-pagar.documentos.ficha',
  params: { documentoId: props.documento.id },
}));
</script>

<template>
  <TarjetaBase
    class="flex h-full items-start gap-3"
    :class="[marcado ? 'ring-2 ring-campo-500' : '', documento.estado === 'anulado' ? 'opacity-80' : '']"
  >
    <input
      v-if="puedeMarcar"
      type="checkbox"
      class="mt-1 size-5 shrink-0 rounded border-tierra-300 text-campo-600 focus:ring-campo-500"
      :checked="marcado"
      :aria-label="`Escoger ${tituloDeDocumento(documento)} para autorizar`"
      @change="$emit('alternar')"
    />
    <RouterLink
      :to="destino"
      class="flex min-w-0 flex-1 flex-col gap-3 rounded-lg focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none"
    >
      <span class="flex items-start justify-between gap-2">
        <span class="min-w-0">
          <span class="block truncate font-semibold">{{ tituloDeDocumento(documento) }}</span>
          <span class="block truncate text-sm text-tierra-600 dark:text-tierra-300">
            {{ documento.proveedorNombre }}
          </span>
        </span>
        <ChevronRight class="size-4 shrink-0 text-tierra-400" aria-hidden="true" />
      </span>
      <span class="flex flex-wrap gap-1.5">
        <InsigniaBase :tono="tonoDeEstado(documento.estado)">{{ textoDeEstado(documento.estado) }}</InsigniaBase>
        <InsigniaBase v-if="documento.vencido" tono="rojo">Vencido</InsigniaBase>
        <InsigniaBase v-if="documento.clase === 'abono'" tono="campo">A favor</InsigniaBase>
      </span>
      <dl class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        <div v-for="detalle in detallesDeLista(documento)" :key="detalle.etiqueta" class="min-w-0">
          <dt class="text-xs text-tierra-500">{{ detalle.etiqueta }}</dt>
          <dd class="truncate">{{ detalle.valor }}</dd>
        </div>
      </dl>
      <span v-if="esperaAOtraPersona" class="text-xs text-trigo-700 dark:text-trigo-300">
        Lo ingresó o completó usted: lo autoriza otra persona.
      </span>
    </RouterLink>
  </TarjetaBase>
</template>
