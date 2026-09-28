<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import { RouterLink } from 'vue-router';
import {
  detallesDeConciliacion,
  periodoDeConciliacion,
  TEXTO_DEL_ESTADO,
} from '../../composables/conciliaciones/detalles-de-conciliacion';
import type { ConciliacionResumen } from '../../servicios/conciliaciones.api';

/** La conciliación en la lista de la cuenta: su periodo, su estado, y "Eliminar" solo en la última. */
const props = defineProps<{ registro: ConciliacionResumen; esUltima: boolean }>();
const emit = defineEmits<{ eliminar: [] }>();

const textoDeIr = computed(() => (props.registro.estado === 'en_proceso' ? 'Conciliar' : 'Ver'));
</script>

<template>
  <TarjetaDeRegistro
    :titulo="periodoDeConciliacion(registro)"
    :detalles="detallesDeConciliacion(registro)"
    permiso="bancos.conciliaciones.conciliar"
    :insignia="TEXTO_DEL_ESTADO[registro.estado]"
    sin-editar
  >
    <template #acciones-extra>
      <RouterLink
        :to="{ name: 'bancos.conciliaciones.conciliar', params: { conciliacionId: registro.id } }"
        class="text-sm font-medium text-campo-700 hover:underline dark:text-campo-400"
      >
        {{ textoDeIr }}
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
