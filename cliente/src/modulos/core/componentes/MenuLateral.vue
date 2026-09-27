<script setup lang="ts">
import { House } from 'lucide-vue-next';
import type { GrupoVisible } from '../menu/construir-menu';
import { VENTANAS_CORE } from '../textos';
import GrupoDelMenu from './GrupoDelMenu.vue';
import OpcionDelMenu from './OpcionDelMenu.vue';

defineProps<{ grupos: GrupoVisible[]; abiertos: ReadonlySet<string> }>();
defineEmits<{ alternar: [clave: string] }>();
</script>

<template>
  <nav
    class="flex-1 space-y-1 overflow-x-hidden overflow-y-auto px-3 pb-4 [scrollbar-color:color-mix(in_oklab,var(--color-marca-texto)_25%,transparent)_transparent] [scrollbar-width:thin]"
  >
    <OpcionDelMenu ruta="/" :titulo="VENTANAS_CORE.inicio.titulo" :icono="House" />
    <GrupoDelMenu
      v-for="grupo in grupos"
      :key="grupo.clave"
      :grupo="grupo"
      :abierto="abiertos.has(grupo.clave)"
      @alternar="$emit('alternar', grupo.clave)"
    />
  </nav>
</template>
