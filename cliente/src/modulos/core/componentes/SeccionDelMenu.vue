<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next';
import type { SeccionVisible } from '../menu/construir-menu';
import OpcionDelMenu from './OpcionDelMenu.vue';

const props = defineProps<{ seccion: SeccionVisible; abierta: boolean }>();
defineEmits<{ alternar: [] }>();

const idDelContenido = `menu-${props.seccion.clave.replace('/', '-')}`;
</script>

<template>
  <div>
    <button
      type="button"
      class="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] font-semibold tracking-wider text-marca-texto/60 uppercase hover:bg-marca-texto/10 hover:text-marca-texto/85"
      :aria-expanded="abierta"
      :aria-controls="idDelContenido"
      @click="$emit('alternar')"
    >
      <span class="flex-1 text-left">{{ seccion.titulo }}</span>
      <ChevronDown class="size-3.5 shrink-0 transition-transform" :class="{ '-rotate-90': !abierta }" />
    </button>
    <ul v-show="abierta" :id="idDelContenido" class="space-y-0.5">
      <li v-for="entrada in seccion.entradas" :key="entrada.ruta">
        <OpcionDelMenu :ruta="entrada.ruta" :titulo="entrada.titulo" :icono="entrada.icono" />
      </li>
    </ul>
  </div>
</template>
