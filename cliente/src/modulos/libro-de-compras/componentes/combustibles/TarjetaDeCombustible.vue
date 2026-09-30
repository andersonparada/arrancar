<script setup lang="ts">
import { History } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import { detallesDeCombustible } from '../../composables/combustibles/detalles-de-combustible';
import type { Combustible } from '../../servicios/combustibles.api';
import type { VigenciaDeCombustible } from '../../servicios/vigencias-de-combustible.api';
import CambioDeEstadoEnTarjeta from '../CambioDeEstadoEnTarjeta.vue';

/** El combustible en la lista, con su tasa vigente y el acceso a su historia de tasas; se edita, inactiva o reactiva. */
defineProps<{ registro: Combustible; vigente: VigenciaDeCombustible | null; puedeVerTasas: boolean }>();
defineEmits<{ editar: []; 'cambiar-estado': []; tasas: [] }>();
const PERMISO = 'libro-de-compras.combustibles.editar';
</script>

<template>
  <TarjetaDeRegistro
    :titulo="registro.nombre"
    :detalles="detallesDeCombustible(vigente, puedeVerTasas)"
    :permiso="PERMISO"
    :inactivo="!registro.activo"
    @editar="$emit('editar')"
  >
    <template #acciones-extra>
      <BotonBase
        v-permiso="'libro-de-compras.vigencias-de-combustible.ver'"
        variante="fantasma"
        pequeno
        :icono="History"
        @click="$emit('tasas')"
      >
        Tasas de IDP
      </BotonBase>
      <CambioDeEstadoEnTarjeta :activo="registro.activo" :permiso="PERMISO" @cambiar="$emit('cambiar-estado')" />
    </template>
  </TarjetaDeRegistro>
</template>
