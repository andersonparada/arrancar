<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import { RouterLink } from 'vue-router';
import {
  detallesDeConciliacion,
  periodoDeConciliacion,
} from '../../composables/conciliaciones/detalles-de-conciliacion';
import type { ConciliacionResumen } from '../../servicios/conciliaciones.api';

/** La conciliación en la lista de la cuenta: su periodo, si está cerrada, y "Eliminar" solo en la última. */
const props = defineProps<{ registro: ConciliacionResumen; esUltima: boolean }>();
const emit = defineEmits<{ eliminar: [] }>();
</script>

<template>
  <TarjetaDeRegistro
    :titulo="periodoDeConciliacion(registro)"
    :detalles="detallesDeConciliacion(registro)"
    permiso="bancos.conciliaciones.conciliar"
    :insignia="registro.cerrada ? 'Cerrada' : 'Abierta'"
    sin-editar
  >
    <template #acciones-extra>
      <RouterLink
        :to="{ name: 'bancos.conciliaciones.conciliar', params: { conciliacionId: registro.id } }"
        class="text-sm font-medium text-campo-700 hover:underline dark:text-campo-400"
      >
        {{ registro.cerrada ? 'Ver' : 'Conciliar' }}
      </RouterLink>
      <BotonBase
        v-if="props.esUltima"
        v-permiso="'bancos.conciliaciones.eliminar'"
        variante="fantasma"
        pequeno
        @click="emit('eliminar')"
      >
        Eliminar
      </BotonBase>
    </template>
  </TarjetaDeRegistro>
</template>
