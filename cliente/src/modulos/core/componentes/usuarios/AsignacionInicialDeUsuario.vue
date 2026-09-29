<script setup lang="ts">
import { computed } from 'vue';
import type { GrupoPermisos, Rol } from '../../servicios/roles.api';
import InsigniaBase from '../InsigniaBase.vue';
import SelectorDePermisos from '../roles/SelectorDePermisos.vue';

/** Roles y permisos directos con los que nace un usuario; después se cambian en su página de permisos. */
const props = defineProps<{ roles: Rol[]; catalogo: GrupoPermisos[] }>();
const rolIds = defineModel<string[]>('rolIds', { required: true });
const permisos = defineModel<string[]>('permisos', { required: true });

const rolesPorNombre = computed(() => [...props.roles].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
</script>

<template>
  <fieldset class="space-y-2">
    <legend class="text-sm font-semibold">Roles (opcional)</legend>
    <p class="text-xs text-tierra-500">Un rol es un atajo: sus permisos se suman a los permisos directos.</p>
    <p v-if="!roles.length" class="text-sm text-tierra-500">Todavía no hay roles en esta cuenta.</p>
    <label
      v-for="rol in rolesPorNombre"
      :key="rol.id"
      class="flex cursor-pointer items-center gap-2.5 rounded-lg p-2 hover:bg-tierra-50 dark:hover:bg-tierra-800"
    >
      <input v-model="rolIds" type="checkbox" :value="rol.id" class="size-4 rounded accent-campo-700" />
      <span class="text-sm">{{ rol.nombre }}</span>
      <InsigniaBase v-if="rol.accesoTotal" tono="trigo">Acceso total</InsigniaBase>
    </label>
  </fieldset>
  <details v-if="catalogo.length" class="rounded-xl ring-1 ring-tierra-200 dark:ring-tierra-700">
    <summary class="cursor-pointer p-3 text-sm font-semibold">
      Permisos directos (opcional)
      <span v-if="permisos.length" class="font-normal text-tierra-500">· {{ permisos.length }} marcados</span>
    </summary>
    <div class="p-3 pt-0">
      <SelectorDePermisos v-model="permisos" :catalogo="catalogo" />
    </div>
  </details>
</template>
