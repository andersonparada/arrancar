<script setup lang="ts">
import { computed } from 'vue';
import { House, Users } from 'lucide-vue-next';
import { variablesTema } from '../../utilidades/colores';

/** Un menú y una pantalla de inicio de sesión en miniatura, pintados con el borrador. */
const props = defineProps<{ nombre: string; principal: string; acento: string; logo: string }>();
const estilo = computed(() => variablesTema(props.principal, props.acento));
const nombreVisible = computed(() => props.nombre || 'Sin nombre');
</script>

<template>
  <div class="space-y-3 lg:sticky lg:top-8 lg:self-start">
    <p class="text-sm font-semibold tracking-wider text-tierra-500 uppercase">Vista previa</p>
    <div
      :style="estilo"
      class="overflow-hidden rounded-2xl ring-1 ring-tierra-200 dark:ring-tierra-700"
      aria-hidden="true"
    >
      <div class="flex h-72">
        <div class="flex w-44 flex-col bg-marca p-3 text-marca-texto">
          <div class="mb-3 flex items-center gap-2">
            <img :src="logo" alt="" class="size-6 object-contain" />
            <span class="truncate text-sm font-bold">{{ nombreVisible }}</span>
          </div>
          <div class="mb-3 rounded-md bg-marca-oscuro/60 px-2 py-1.5 text-xs ring-1 ring-marca-texto/15">
            Rancho San José
          </div>
          <p class="mb-1 text-[10px] font-semibold tracking-wider text-marca-texto/60 uppercase">General</p>
          <div class="relative mb-1 flex items-center gap-2 rounded-md bg-marca-texto/15 px-2 py-1.5 text-xs">
            <span class="absolute inset-y-1.5 left-0 w-0.5 rounded-r-full bg-acento" />
            <House class="size-3.5" />Inicio
          </div>
          <div class="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-marca-texto/85">
            <Users class="size-3.5" />Usuarios
          </div>
          <div class="mt-auto flex items-center gap-2 border-t border-marca-texto/10 pt-2">
            <span
              class="flex size-6 items-center justify-center rounded-full bg-acento text-[10px] font-bold text-acento-texto"
              >DD</span
            >
            <span class="truncate text-xs">Dueño Demo</span>
          </div>
        </div>
        <div class="flex-1 space-y-2 bg-tierra-50 p-3 dark:bg-tierra-900">
          <div class="h-3 w-24 rounded bg-tierra-300 dark:bg-tierra-700" />
          <div class="h-14 rounded-lg bg-white ring-1 ring-tierra-200 dark:bg-tierra-800 dark:ring-tierra-700" />
          <div class="h-14 rounded-lg bg-white ring-1 ring-tierra-200 dark:bg-tierra-800 dark:ring-tierra-700" />
        </div>
      </div>
      <div class="flex flex-col items-center gap-1 bg-linear-to-b from-marca to-marca-oscuro py-5 text-marca-texto">
        <img :src="logo" alt="" class="size-10 object-contain" />
        <span class="text-sm font-bold">{{ nombreVisible }}</span>
        <span class="text-[11px] text-marca-texto/75">Pantalla de inicio de sesión</span>
      </div>
    </div>
  </div>
</template>
