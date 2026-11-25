<script setup lang="ts">
import { Undo2, Ban } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { detallesDeComprobante, tituloDeComprobante } from '../composables/comprobantes/detalles-de-comprobante';
import type { Comprobante } from '../servicios/tipos-de-comprobantes';
import EstadoDelDocumentoAnulado from './EstadoDelDocumentoAnulado.vue';
import MarcasDelComprobante from './MarcasDelComprobante.vue';

/**
 * Un comprobante del fondo. Un documento del libro puede volver a la bandeja y un vale de gasto se anula, mientras no
 * esté repuesto; el servidor decide si se puede y explica por qué si no.
 */
const props = defineProps<{ comprobante: Comprobante; puedeCambiar: boolean }>();
const emit = defineEmits<{
  devolver: [];
  anular: [];
  resolver: [];
  disputa: [];
  retirarDisputa: [];
}>();

const vigenteSinRepuesto = (): boolean =>
  props.comprobante.estado === 'vigente' && props.comprobante.reposicionNumero === null;
</script>

<template>
  <TarjetaBase class="space-y-3">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div class="min-w-0">
        <h3 class="truncate font-semibold">{{ tituloDeComprobante(comprobante) }}</h3>
        <p v-if="comprobante.descripcion" class="text-sm text-tierra-600 dark:text-tierra-300">
          {{ comprobante.descripcion }}
        </p>
      </div>
      <MarcasDelComprobante :comprobante="comprobante" />
    </div>
    <dl class="grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
      <div v-for="detalle in detallesDeComprobante(comprobante)" :key="detalle.etiqueta" class="min-w-0">
        <dt class="text-xs text-tierra-500">{{ detalle.etiqueta }}</dt>
        <dd class="break-words">{{ detalle.valor }}</dd>
      </div>
    </dl>
    <EstadoDelDocumentoAnulado
      :comprobante="comprobante"
      @resolver="emit('resolver')"
      @disputa="emit('disputa')"
      @retirar-disputa="emit('retirarDisputa')"
    />
    <p v-if="comprobante.motivoSinDocumento" class="text-sm text-tierra-600 dark:text-tierra-300">
      Sin factura: {{ comprobante.motivoSinDocumento }}
    </p>
    <p v-if="comprobante.motivoConRetencion" class="text-sm text-tierra-600 dark:text-tierra-300">
      Excepción de retención: {{ comprobante.motivoConRetencion }}
    </p>
    <p v-if="comprobante.motivoSobreElTope" class="text-sm text-tierra-600 dark:text-tierra-300">
      Excepción de tope: {{ comprobante.motivoSobreElTope }}
    </p>
    <p v-if="comprobante.motivoDeAnulacion" class="text-sm text-tierra-600 dark:text-tierra-300">
      Anulado: {{ comprobante.motivoDeAnulacion }}
    </p>
    <div v-if="puedeCambiar && vigenteSinRepuesto()" class="flex flex-wrap gap-2">
      <BotonBase
        v-if="comprobante.clase === 'documento'"
        v-permiso="'caja-chica.comprobantes.crear'"
        variante="secundario"
        pequeno
        :icono="Undo2"
        @click="emit('devolver')"
      >
        Devolver a la bandeja
      </BotonBase>
      <BotonBase
        v-if="comprobante.clase === 'vale_de_gasto' && comprobante.valeProvisionalId === null"
        v-permiso="'caja-chica.comprobantes.anular'"
        variante="secundario"
        pequeno
        :icono="Ban"
        @click="emit('anular')"
      >
        Anular vale
      </BotonBase>
    </div>
  </TarjetaBase>
</template>
