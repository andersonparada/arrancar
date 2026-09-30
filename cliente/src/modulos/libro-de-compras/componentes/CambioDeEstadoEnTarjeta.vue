<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';

/** El botón «Inactivar» o «Reactivar» de la tarjeta de un catálogo; solo lo ve quien puede editar. */
defineProps<{ activo: boolean; permiso: string }>();
defineEmits<{ cambiar: [] }>();
</script>

<template>
  <BotonBase v-permiso="permiso" variante="fantasma" pequeno @click="$emit('cambiar')">
    {{ activo ? 'Inactivar' : 'Reactivar' }}
  </BotonBase>
</template>
