<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';

/**
 * El registro de un catálogo de Inventarios en su lista: se edita, se inactiva o reactiva y se elimina.
 * `permisos` es el prefijo de sus permisos (`inventarios.unidades`).
 */
defineProps<{ titulo: string; detalles: DetalleDeRegistro[]; activo: boolean; permisos: string }>();
const emit = defineEmits<{ editar: []; eliminar: []; 'cambiar-estado': [] }>();
</script>

<template>
  <TarjetaDeRegistro
    :titulo="titulo"
    :detalles="detalles"
    :permiso="`${permisos}.editar`"
    :permiso-eliminar="`${permisos}.eliminar`"
    :inactivo="!activo"
    eliminable
    @editar="emit('editar')"
    @eliminar="emit('eliminar')"
  >
    <template #acciones-extra>
      <BotonBase v-permiso="`${permisos}.editar`" variante="fantasma" pequeno @click="emit('cambiar-estado')">
        {{ activo ? 'Inactivar' : 'Reactivar' }}
      </BotonBase>
    </template>
  </TarjetaDeRegistro>
</template>
