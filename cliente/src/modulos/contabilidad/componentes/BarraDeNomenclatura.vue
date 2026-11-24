<script setup lang="ts">
import { ChevronsDownUp, ChevronsUpDown } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';

/** Buscar por código o nombre, ver u ocultar las inactivas, y abrir o plegar todo el árbol. */
const texto = defineModel<string>('texto', { required: true });
const conInactivas = defineModel<boolean>('conInactivas', { required: true });
const emit = defineEmits<{ expandir: []; plegar: [] }>();
</script>

<template>
  <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
    <div class="sm:flex-1">
      <CampoTexto v-model="texto" tipo="search" etiqueta="Buscar cuenta" placeholder="Código o nombre" sin-correccion />
    </div>
    <CampoInterruptor v-model="conInactivas" etiqueta="Ver inactivas" class="sm:w-44" />
    <div class="flex gap-2">
      <BotonBase variante="secundario" pequeno :icono="ChevronsUpDown" @click="emit('expandir')">Abrir todo</BotonBase>
      <BotonBase variante="secundario" pequeno :icono="ChevronsDownUp" @click="emit('plegar')">Plegar todo</BotonBase>
    </div>
  </div>
</template>
