<script setup lang="ts">
import type { EdicionDeUsuario } from '../../composables/usuarios/edicion-de-usuario';
import type { GrupoPermisos, Rol } from '../../servicios/roles.api';
import BotonBase from '../BotonBase.vue';
import CampoInterruptor from '../CampoInterruptor.vue';
import CampoTexto from '../CampoTexto.vue';
import VentanaModal from '../VentanaModal.vue';
import AsignacionInicialDeUsuario from './AsignacionInicialDeUsuario.vue';

defineProps<{
  empresas: { id: string; nombre: string }[];
  /** Roles y catálogo para dar al crear; solo se muestran si `puedeAsignar`. */
  roles: Rol[];
  catalogo: GrupoPermisos[];
  puedeAsignar: boolean;
  esElMismo: boolean;
  errores: Record<string, string>;
  enviando: boolean;
}>();
const emit = defineEmits<{ cerrar: []; guardar: []; escribirUsuario: [valor: unknown] }>();
const edicion = defineModel<EdicionDeUsuario>({ required: true });
</script>

<template>
  <VentanaModal
    :abierta="edicion.abierta"
    :titulo="edicion.usuarioId ? 'Editar usuario' : 'Nuevo usuario'"
    @cerrar="emit('cerrar')"
  >
    <form id="form-usuario" class="space-y-4" @submit.prevent="emit('guardar')">
      <div class="grid gap-4 sm:grid-cols-2">
        <CampoTexto
          v-model="edicion.nombres"
          etiqueta="Nombres"
          placeholder="Ej. Juan Carlos"
          requerido
          :error="errores.nombres"
        />
        <CampoTexto
          v-model="edicion.apellidos"
          etiqueta="Apellidos"
          placeholder="Ej. López García"
          :error="errores.apellidos"
        />
      </div>
      <CampoTexto
        :model-value="edicion.usuario"
        etiqueta="Usuario para iniciar sesión"
        :solo-lectura="edicion.usuarioId !== null"
        sin-correccion
        :ayuda="
          edicion.usuarioId
            ? 'El usuario no se puede cambiar.'
            : 'Se sugiere a partir del nombre (solo letras). Puede cambiarlo.'
        "
        :error="errores.usuario"
        @update:model-value="emit('escribirUsuario', $event)"
      />
      <CampoTexto
        v-model="edicion.correo"
        etiqueta="Correo (opcional)"
        tipo="email"
        ayuda="Solo para enviarle informes; no se usa para iniciar sesión."
        :error="errores.correo"
      />
      <CampoTexto
        v-if="!edicion.usuarioId"
        v-model="edicion.contrasena"
        etiqueta="Contraseña inicial"
        tipo="password"
        autocompletar="new-password"
        ayuda="Mínimo 10 caracteres. Compártala con la persona por un medio seguro."
        requerido
        :error="errores.contrasena"
      />
      <p v-if="esElMismo" class="text-sm text-tierra-500">No puede cambiar sus propias empresas ni su estado.</p>
      <template v-else>
        <CampoInterruptor
          v-if="edicion.usuarioId"
          v-model="edicion.activo"
          etiqueta="Usuario activo"
          descripcion="Un usuario inactivo no puede iniciar sesión."
        />
        <fieldset class="space-y-2">
          <legend class="text-sm font-semibold">Empresas a las que entra</legend>
          <p class="text-xs text-tierra-500">Lo que puede hacer se define en sus roles y permisos.</p>
          <p v-if="errores.empresaIds" class="text-sm text-red-700 dark:text-red-400" role="alert">
            {{ errores.empresaIds }}
          </p>
          <label
            v-for="empresa in empresas"
            :key="empresa.id"
            class="flex cursor-pointer items-center gap-2.5 rounded-lg p-2 hover:bg-tierra-50 dark:hover:bg-tierra-800"
          >
            <input
              v-model="edicion.empresaIds"
              type="checkbox"
              :value="empresa.id"
              class="size-4 rounded accent-campo-700"
            />
            <span class="text-sm">{{ empresa.nombre }}</span>
          </label>
        </fieldset>
        <AsignacionInicialDeUsuario
          v-if="!edicion.usuarioId && puedeAsignar"
          v-model:rol-ids="edicion.rolIds"
          v-model:permisos="edicion.permisos"
          :roles="roles"
          :catalogo="catalogo"
        />
      </template>
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-usuario" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
