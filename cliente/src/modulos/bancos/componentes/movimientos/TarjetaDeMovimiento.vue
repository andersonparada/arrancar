<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import {
  CLASE_DE_TIPO,
  SIGNO_DE_TIPO,
  detallesDeMovimiento,
  tituloDeMovimiento,
} from '../../composables/movimientos/detalles-de-movimiento';
import type { Movimiento } from '../../servicios/movimientos.api';

/** La tarjeta de un movimiento: monto destacado con color, y "Anular" en vez de "Eliminar". */
defineProps<{ registro: Movimiento }>();
const emit = defineEmits<{ editar: []; anular: [] }>();
</script>

<template>
  <TarjetaDeRegistro
    :titulo="tituloDeMovimiento(registro)"
    :detalles="detallesDeMovimiento(registro)"
    permiso="bancos.movimientos.gestionar"
    :insignia="registro.anuladoEn ? 'Anulado' : undefined"
    :solo-lectura="!!registro.anuladoEn"
    @editar="emit('editar')"
  >
    <template #destacado>
      <p class="text-sm font-semibold" :class="CLASE_DE_TIPO[registro.tipo]">
        {{ SIGNO_DE_TIPO[registro.tipo] }} {{ formatearMonto(registro.monto) }}
      </p>
    </template>
    <template #acciones-extra>
      <BotonBase v-permiso="'bancos.movimientos.anular'" variante="fantasma" pequeno @click="emit('anular')">
        Anular
      </BotonBase>
    </template>
  </TarjetaDeRegistro>
</template>
