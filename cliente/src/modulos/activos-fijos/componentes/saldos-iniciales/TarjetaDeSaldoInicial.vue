<script setup lang="ts">
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import { detallesDeTarjetaDeSaldo } from '../../composables/saldos-iniciales/detalles-de-saldo';
import type { SaldoInicial } from '../../servicios/saldos-iniciales.api';

/** Un activo de saldo inicial en la lista; editar y eliminar solo se ofrecen con la carga abierta. */
defineProps<{ registro: SaldoInicial; editable: boolean }>();
const emit = defineEmits<{ editar: []; eliminar: [] }>();
</script>

<template>
  <TarjetaDeRegistro
    :titulo="`${registro.codigo} · ${registro.descripcion}`"
    :detalles="detallesDeTarjetaDeSaldo(registro)"
    permiso="activos-fijos.saldos-iniciales.editar"
    permiso-eliminar="activos-fijos.saldos-iniciales.eliminar"
    :insignia="registro.enConstruccion ? 'En construcción' : undefined"
    :solo-lectura="!editable"
    eliminable
    @editar="emit('editar')"
    @eliminar="emit('eliminar')"
  />
</template>
