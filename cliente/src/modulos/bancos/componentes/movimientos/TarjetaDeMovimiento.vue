<script setup lang="ts">
import { computed } from 'vue';
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

/**
 * La tarjeta de un movimiento: monto destacado con color, y "Anular" en vez de
 * "Eliminar". Una nota de transferencia se marca y no se edita: "Anular" pide su
 * propio permiso y anula la transferencia completa.
 */
const props = defineProps<{ registro: Movimiento }>();
const emit = defineEmits<{ editar: []; anular: [] }>();

const insignia = computed(() => {
  if (props.registro.anuladoEn) return 'Anulado';
  if (props.registro.transferenciaId) return 'Transferencia';
  return undefined;
});
const permisoDeAnular = computed(() => {
  if (props.registro.transferenciaId) return 'bancos.transferencias.anular';
  if (props.registro.tipo === 'cheque') return 'bancos.cheques.anular';
  return 'bancos.movimientos.anular';
});
const sinEditar = computed(() => !!props.registro.transferenciaId || props.registro.tipo === 'cheque');
</script>

<template>
  <TarjetaDeRegistro
    :titulo="tituloDeMovimiento(registro)"
    :detalles="detallesDeMovimiento(registro)"
    permiso="bancos.movimientos.gestionar"
    :insignia="insignia"
    :solo-lectura="!!registro.anuladoEn"
    :sin-editar="sinEditar"
    @editar="emit('editar')"
  >
    <template #destacado>
      <p class="text-sm font-semibold" :class="CLASE_DE_TIPO[registro.tipo]">
        {{ SIGNO_DE_TIPO[registro.tipo] }} {{ formatearMonto(registro.monto) }}
      </p>
    </template>
    <template #acciones-extra>
      <BotonBase v-permiso="permisoDeAnular" variante="fantasma" pequeno @click="emit('anular')">Anular</BotonBase>
    </template>
  </TarjetaDeRegistro>
</template>
