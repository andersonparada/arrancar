<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import {
  detallesDeChequeListado,
  insigniaDeChequeListado,
  tituloDeChequeListado,
} from '../../composables/cheques/detalles-de-cheque-listado';
import type { ChequeListado } from '../../servicios/cheques.api';
import AccionesDeImpresionDeCheque from './AccionesDeImpresionDeCheque.vue';

/**
 * Un cheque de la lista de la empresa: monto con color (siempre sale dinero). Las acciones aparecen solo si el servidor
 * dice que se pueden; los cheques no se eliminan. Un cheque por imprimir se puede marcar para imprimir varios de una vez
 * (de una misma chequera): si no se puede marcar ahora, la casilla dice por qué.
 */
const props = defineProps<{
  registro: ChequeListado;
  marcado: boolean;
  /** Por qué no se puede marcar ahora (otra chequera, lote lleno); `null` si se puede. */
  bloqueo: string | null;
}>();
const emit = defineEmits<{
  anular: [];
  blanquear: [];
  alternar: [];
  imprimir: [];
  reimprimir: [];
  historial: [];
  pasar: [];
}>();
const titulo = () => tituloDeChequeListado(props.registro);
</script>

<template>
  <TarjetaDeRegistro
    :titulo="titulo()"
    :detalles="detallesDeChequeListado(registro)"
    permiso="bancos.cheques.anular"
    :insignia="insigniaDeChequeListado(registro)"
    sin-editar
  >
    <template #destacado>
      <p v-if="registro.monto" class="text-sm font-semibold text-red-700 dark:text-red-400">
        − {{ formatearMonto(registro.monto) }}
      </p>
      <label
        v-if="registro.puedeImprimir"
        v-permiso="'bancos.cheques.imprimir'"
        class="mt-1 flex items-center gap-2 text-sm"
        :class="bloqueo && !marcado ? 'text-tierra-400' : ''"
        :title="bloqueo && !marcado ? bloqueo : undefined"
      >
        <input
          type="checkbox"
          class="size-5 accent-campo-700"
          :checked="marcado"
          :disabled="!!bloqueo && !marcado"
          :aria-label="`Elegir el ${titulo()} para imprimir`"
          @change="emit('alternar')"
        />
        Elegir para imprimir
      </label>
    </template>
    <template #acciones-extra>
      <AccionesDeImpresionDeCheque
        :puede-imprimir="registro.puedeImprimir"
        :puede-reimprimir="registro.puedeReimprimir"
        :puede-pasar-a-otro-formulario="registro.puedePasarAOtroFormulario"
        :puede-declarar-extraviado="registro.puedeDeclararExtraviado"
        :impreso="registro.impresoEn !== null"
        @imprimir="emit('imprimir')"
        @reimprimir="emit('reimprimir')"
        @historial="emit('historial')"
        @pasar="emit('pasar')"
      />
      <BotonBase
        v-if="registro.puedeAnular"
        v-permiso="'bancos.cheques.anular'"
        variante="fantasma"
        pequeno
        @click="emit('anular')"
      >
        Anular
      </BotonBase>
      <BotonBase
        v-if="registro.puedeBlanquear"
        v-permiso="'bancos.cheques.blanquear'"
        variante="fantasma"
        pequeno
        @click="emit('blanquear')"
      >
        Blanquear
      </BotonBase>
    </template>
  </TarjetaDeRegistro>
</template>
