<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import {
  detallesDeTransferencia,
  tituloDeTransferencia,
} from '../../composables/transferencias/detalles-de-transferencia';
import type { Transferencia } from '../../servicios/transferencias.api';

/** La tarjeta de una transferencia: cuenta de origen → cuenta de destino, con el monto destacado; nunca se corrige. */
const props = defineProps<{ registro: Transferencia }>();
defineEmits<{ anular: [] }>();

const insignia = computed(() => (props.registro.anuladaEn ? 'Anulada' : undefined));
</script>

<template>
  <TarjetaDeRegistro
    :titulo="tituloDeTransferencia(registro)"
    :detalles="detallesDeTransferencia(registro)"
    permiso="bancos.transferencias.anular"
    :insignia="insignia"
    :solo-lectura="!!registro.anuladaEn"
    sin-editar
  >
    <template #destacado>
      <p class="text-sm font-semibold text-campo-700 dark:text-campo-400">{{ formatearMonto(registro.monto) }}</p>
    </template>
    <template #acciones-extra>
      <BotonBase v-permiso="'bancos.transferencias.anular'" variante="fantasma" pequeno @click="$emit('anular')">
        Anular
      </BotonBase>
    </template>
  </TarjetaDeRegistro>
</template>
