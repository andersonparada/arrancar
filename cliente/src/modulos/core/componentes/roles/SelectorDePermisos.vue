<script setup lang="ts">
import { ShieldCheck } from 'lucide-vue-next';
import type { GrupoPermisos } from '../../servicios/roles.api';

/** Los permisos del catálogo agrupados por módulo, cada uno con su casilla. */
defineProps<{ catalogo: GrupoPermisos[] }>();
const permisos = defineModel<string[]>({ required: true });
</script>

<template>
  <div class="space-y-4">
    <fieldset
      v-for="grupo in catalogo"
      :key="grupo.modulo"
      class="rounded-xl ring-1 ring-tierra-200 dark:ring-tierra-700"
    >
      <legend class="ml-3 flex items-center gap-1.5 px-1 text-sm font-semibold">
        <ShieldCheck class="size-4 text-campo-600" aria-hidden="true" />{{ grupo.nombre }}
      </legend>
      <div class="grid gap-2 p-3 sm:grid-cols-2">
        <label
          v-for="permiso in grupo.permisos"
          :key="permiso.clave"
          class="flex cursor-pointer items-start gap-2.5 rounded-lg p-2 hover:bg-tierra-50 dark:hover:bg-tierra-800"
        >
          <input
            v-model="permisos"
            type="checkbox"
            :value="permiso.clave"
            class="mt-0.5 size-4 rounded accent-campo-700"
          />
          <span class="text-sm">
            {{ permiso.descripcion }}
            <span class="block font-mono text-xs break-all text-tierra-400">{{ permiso.clave }}</span>
          </span>
        </label>
      </div>
    </fieldset>
  </div>
</template>
