<script setup lang="ts">
import { ShieldCheck } from 'lucide-vue-next';
import {
  textoDeOrigen,
  type GrupoConOrigen,
  type PermisoConOrigen,
} from '../../composables/usuarios/permisos-de-usuario';
import InsigniaBase from '../InsigniaBase.vue';

/**
 * Los permisos por módulo. Los que da un rol se ven marcados y bloqueados (se quitan desde el rol);
 * los directos se marcan aquí, uno por uno o todos los del módulo.
 */
const props = defineProps<{ grupos: GrupoConOrigen[]; deshabilitado: boolean }>();
const emit = defineEmits<{ marcarTodos: [grupo: GrupoConOrigen, marcar: boolean] }>();
const directos = defineModel<string[]>({ required: true });

const tonoDe = (tipo: string) => (tipo === 'directo' ? 'tierra' : tipo === 'rol' ? 'campo' : 'trigo');

function alternar(permiso: PermisoConOrigen, marcar: boolean): void {
  directos.value = marcar
    ? [...directos.value, permiso.clave]
    : directos.value.filter((clave) => clave !== permiso.clave);
}

const sinEditables = (grupo: GrupoConOrigen) => props.deshabilitado || grupo.permisos.every((p) => p.bloqueado);
</script>

<template>
  <div class="space-y-4">
    <fieldset
      v-for="grupo in grupos"
      :key="grupo.modulo"
      class="rounded-xl ring-1 ring-tierra-200 dark:ring-tierra-700"
    >
      <legend class="ml-3 flex items-center gap-1.5 px-1 text-sm font-semibold">
        <ShieldCheck class="size-4 text-campo-600" aria-hidden="true" />{{ grupo.nombre }}
      </legend>
      <label
        class="mx-3 mt-1 flex w-fit cursor-pointer items-center gap-2 text-xs text-tierra-600 dark:text-tierra-300"
        :class="{ 'cursor-not-allowed opacity-60': sinEditables(grupo) }"
      >
        <input
          type="checkbox"
          class="size-4 rounded accent-campo-700"
          :checked="grupo.todosMarcados"
          :disabled="sinEditables(grupo)"
          @change="emit('marcarTodos', grupo, ($event.target as HTMLInputElement).checked)"
        />
        Marcar todos los de {{ grupo.nombre }}
      </label>
      <ul class="grid gap-1 p-3 sm:grid-cols-2">
        <li v-for="permiso in grupo.permisos" :key="permiso.clave" :class="{ 'opacity-60': !permiso.moduloActivo }">
          <label
            class="flex items-start gap-2.5 rounded-lg p-2 hover:bg-tierra-50 dark:hover:bg-tierra-800"
            :class="permiso.bloqueado || deshabilitado ? 'cursor-not-allowed' : 'cursor-pointer'"
          >
            <input
              type="checkbox"
              class="mt-0.5 size-4 shrink-0 rounded accent-campo-700"
              :checked="permiso.marcado"
              :disabled="permiso.bloqueado || deshabilitado"
              @change="alternar(permiso, ($event.target as HTMLInputElement).checked)"
            />
            <span class="min-w-0 text-sm">
              {{ permiso.descripcion }}
              <span class="block truncate font-mono text-xs text-tierra-400">{{ permiso.clave }}</span>
              <span class="mt-1 flex flex-wrap gap-1">
                <InsigniaBase v-for="(origen, i) in permiso.origenes" :key="i" :tono="tonoDe(origen.tipo)">{{
                  textoDeOrigen(origen)
                }}</InsigniaBase>
                <InsigniaBase v-if="!permiso.moduloActivo" tono="rojo">Módulo inactivo</InsigniaBase>
              </span>
            </span>
          </label>
        </li>
      </ul>
    </fieldset>
  </div>
</template>
