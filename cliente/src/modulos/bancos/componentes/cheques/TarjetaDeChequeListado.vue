<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { detallesDeChequeListado, tituloDeChequeListado } from '../../composables/cheques/detalles-de-cheque-listado';
import type { ChequeListado } from '../../servicios/cheques.api';

/**
 * Un cheque de la lista de la empresa: monto con color (siempre sale dinero). «Anular» y «Blanquear»
 * aparecen solo si el servidor dice que se puede; los cheques no se eliminan.
 */
const props = defineProps<{ registro: ChequeListado }>();
const emit = defineEmits<{ anular: []; blanquear: [] }>();

const insignia = () => (props.registro.estado === 'anulado' ? 'Anulado' : undefined);
</script>

<template>
  <TarjetaDeRegistro
    :titulo="tituloDeChequeListado(registro)"
    :detalles="detallesDeChequeListado(registro)"
    permiso="bancos.cheques.anular"
    :insignia="insignia()"
    sin-editar
  >
    <template #destacado>
      <p v-if="registro.monto" class="text-sm font-semibold text-red-700 dark:text-red-400">
        − {{ formatearMonto(registro.monto) }}
      </p>
    </template>
    <template #acciones-extra>
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
