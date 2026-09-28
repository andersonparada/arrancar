<script setup lang="ts">
import { Plus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';

/** Los botones para registrar una nota de crédito o de débito. */
defineEmits<{ credito: []; debito: [] }>();
</script>

<template>
  <BotonBase v-permiso="'bancos.notas.gestionar'" variante="secundario" :icono="Plus" @click="$emit('credito')">
    Nota de crédito
  </BotonBase>
  <BotonBase v-permiso="'bancos.notas.gestionar'" :icono="Plus" @click="$emit('debito')">Nota de débito</BotonBase>
</template>
