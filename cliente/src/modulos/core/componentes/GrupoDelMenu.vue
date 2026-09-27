<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next';
import type { GrupoVisible } from '../menu/construir-menu';
import OpcionDelMenu from './OpcionDelMenu.vue';
import SeccionDelMenu from './SeccionDelMenu.vue';

/** `abiertos` trae tanto los grupos como las secciones abiertas; `alternar` avisa la clave tocada. */
const props = defineProps<{ grupo: GrupoVisible; abiertos: ReadonlySet<string> }>();
defineEmits<{ alternar: [clave: string] }>();

const idDelContenido = `menu-${props.grupo.clave}`;
</script>

<template>
  <div>
    <button
      type="button"
      class="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-semibold text-marca-texto hover:bg-marca-texto/10"
      :aria-expanded="abiertos.has(grupo.clave)"
      :aria-controls="idDelContenido"
      @click="$emit('alternar', grupo.clave)"
    >
      <component :is="grupo.icono" class="size-[18px] shrink-0 opacity-90" aria-hidden="true" />
      <span class="flex-1 truncate text-left">{{ grupo.titulo }}</span>
      <ChevronDown
        class="size-4 shrink-0 opacity-70 transition-transform"
        :class="{ '-rotate-90': !abiertos.has(grupo.clave) }"
      />
    </button>

    <div v-show="abiertos.has(grupo.clave)" :id="idDelContenido" class="mt-1 mb-2 space-y-1 pl-4">
      <template v-if="grupo.conSecciones">
        <SeccionDelMenu
          v-for="seccion in grupo.secciones"
          :key="seccion.clave"
          :seccion="seccion"
          :abierta="abiertos.has(seccion.clave)"
          @alternar="$emit('alternar', seccion.clave)"
        />
      </template>
      <ul v-else class="space-y-0.5">
        <li v-for="entrada in grupo.secciones[0]?.entradas" :key="entrada.ruta">
          <OpcionDelMenu :ruta="entrada.ruta" :titulo="entrada.titulo" :icono="entrada.icono" />
        </li>
      </ul>
    </div>
  </div>
</template>
