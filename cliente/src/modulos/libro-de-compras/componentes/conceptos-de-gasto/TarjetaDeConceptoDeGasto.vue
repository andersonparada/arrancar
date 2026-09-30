<script setup lang="ts">
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import { detallesDeConceptoDeGasto } from '../../composables/conceptos-de-gasto/detalles-de-concepto-de-gasto';
import type { ConceptoDeGasto } from '../../servicios/conceptos-de-gasto.api';
import CambioDeEstadoEnTarjeta from '../CambioDeEstadoEnTarjeta.vue';

/** El concepto de gasto en la lista: se edita, inactiva o reactiva (no se elimina). */
defineProps<{ registro: ConceptoDeGasto }>();
defineEmits<{ editar: []; 'cambiar-estado': [] }>();
const PERMISO = 'libro-de-compras.conceptos-de-gasto.editar';
</script>

<template>
  <TarjetaDeRegistro
    :titulo="registro.nombre"
    :detalles="detallesDeConceptoDeGasto(registro)"
    :permiso="PERMISO"
    :inactivo="!registro.activo"
    @editar="$emit('editar')"
  >
    <template #acciones-extra>
      <CambioDeEstadoEnTarjeta :activo="registro.activo" :permiso="PERMISO" @cambiar="$emit('cambiar-estado')" />
    </template>
  </TarjetaDeRegistro>
</template>
