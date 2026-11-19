<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import { detallesDeCierre, nombreDelMes } from '../../composables/depreciacion/logica-de-cierre';
import type { Cierre } from '../../servicios/depreciacion.api';

/** Un mes de la lista de cierres; solo el último cerrado ofrece «Reabrir». */
defineProps<{ cierre: Cierre; reabrible: boolean }>();
const emit = defineEmits<{ reabrir: [] }>();
</script>

<template>
  <TarjetaDeRegistro
    :titulo="nombreDelMes(cierre.periodo)"
    :detalles="detallesDeCierre(cierre)"
    permiso="activos-fijos.depreciacion.reabrir"
    :insignia="cierre.estado === 'reabierto' ? 'Reabierto' : undefined"
    :class="{ 'opacity-70': cierre.estado === 'reabierto' }"
    sin-editar
  >
    <template #acciones-extra>
      <BotonBase
        v-if="reabrible"
        v-permiso="'activos-fijos.depreciacion.reabrir'"
        variante="fantasma"
        pequeno
        @click="emit('reabrir')"
      >
        Reabrir
      </BotonBase>
    </template>
  </TarjetaDeRegistro>
</template>
