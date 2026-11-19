<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import { detallesDeClase } from '../../composables/clases/detalles-de-clase';
import type { Clase } from '../../servicios/clases.api';

/** La clase de activo en la lista: se edita, se inactiva o reactiva y se elimina (si nadie la usa). */
defineProps<{ registro: Clase }>();
const emit = defineEmits<{ editar: []; eliminar: []; 'cambiar-estado': [] }>();
</script>

<template>
  <TarjetaDeRegistro
    :titulo="registro.nombre"
    :detalles="detallesDeClase(registro)"
    permiso="activos-fijos.clases.editar"
    permiso-eliminar="activos-fijos.clases.eliminar"
    :inactivo="!registro.activo"
    eliminable
    @editar="emit('editar')"
    @eliminar="emit('eliminar')"
  >
    <template #acciones-extra>
      <BotonBase v-permiso="'activos-fijos.clases.editar'" variante="fantasma" pequeno @click="emit('cambiar-estado')">
        {{ registro.activo ? 'Inactivar' : 'Reactivar' }}
      </BotonBase>
    </template>
  </TarjetaDeRegistro>
</template>
