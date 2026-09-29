<script setup lang="ts">
import type { Rol } from '../../servicios/roles.api';
import InsigniaBase from '../InsigniaBase.vue';

/** Los roles de la cuenta con una casilla cada uno; un rol es un atajo que suma sus permisos. */
defineProps<{ roles: Rol[]; deshabilitado: boolean }>();
const rolIds = defineModel<string[]>({ required: true });
</script>

<template>
  <fieldset class="rounded-xl ring-1 ring-tierra-200 dark:ring-tierra-700" :disabled="deshabilitado">
    <legend class="ml-3 px-1 text-sm font-semibold">Roles</legend>
    <p v-if="!roles.length" class="p-3 text-sm text-tierra-500">Todavía no hay roles en esta cuenta.</p>
    <div class="grid gap-2 p-3 sm:grid-cols-2">
      <label
        v-for="rol in roles"
        :key="rol.id"
        class="flex cursor-pointer items-start gap-2.5 rounded-lg p-2 hover:bg-tierra-50 dark:hover:bg-tierra-800"
      >
        <input v-model="rolIds" type="checkbox" :value="rol.id" class="mt-0.5 size-4 rounded accent-campo-700" />
        <span class="min-w-0 text-sm">
          <span class="font-medium">{{ rol.nombre }}</span>
          <InsigniaBase v-if="rol.accesoTotal" tono="trigo" class="ml-1.5">Acceso total</InsigniaBase>
          <span v-if="rol.descripcion" class="block text-xs text-tierra-500">{{ rol.descripcion }}</span>
        </span>
      </label>
    </div>
    <p
      v-if="roles.some((rol) => rol.accesoTotal && rolIds.includes(rol.id))"
      class="px-4 pb-3 text-xs text-tierra-600 dark:text-tierra-300"
    >
      Un rol con acceso total da todos los permisos, también los de módulos que se activen después.
    </p>
  </fieldset>
</template>
