<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next';
import type { GrupoVisible } from '../menu/construir-menu';
import OpcionDelMenu from './OpcionDelMenu.vue';

const props = defineProps<{ grupo: GrupoVisible; abierto: boolean }>();
defineEmits<{ alternar: [] }>();

const idDelContenido = `menu-${props.grupo.clave}`;
</script>

<template>
  <div>
    <button
      type="button"
      class="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-semibold text-marca-texto hover:bg-marca-texto/10"
      :aria-expanded="abierto"
      :aria-controls="idDelContenido"
      @click="$emit('alternar')"
    >
      <component :is="grupo.icono" class="size-[18px] shrink-0 opacity-90" aria-hidden="true" />
      <span class="flex-1 truncate text-left">{{ grupo.titulo }}</span>
      <ChevronDown class="size-4 shrink-0 opacity-70 transition-transform" :class="{ '-rotate-90': !abierto }" />
    </button>

    <div v-show="abierto" :id="idDelContenido" class="mt-1 mb-2 space-y-2 pl-4">
      <div v-for="seccion in grupo.secciones" :key="seccion.seccion">
        <p class="px-2.5 pt-1 pb-0.5 text-[11px] font-semibold tracking-wider text-marca-texto/55 uppercase">
          {{ seccion.titulo }}
        </p>
        <ul class="space-y-0.5">
          <li v-for="entrada in seccion.entradas" :key="entrada.ruta">
            <OpcionDelMenu :ruta="entrada.ruta" :titulo="entrada.titulo" :icono="entrada.icono" />
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
