<script setup lang="ts">
import type { EdicionDeUsuario } from '../../composables/usuarios/edicion-de-usuario';
import BotonBase from '../BotonBase.vue';
import CampoInterruptor from '../CampoInterruptor.vue';
import CampoSelector from '../CampoSelector.vue';
import CampoTexto from '../CampoTexto.vue';
import VentanaModal from '../VentanaModal.vue';

defineProps<{
  empresas: { id: string; nombre: string }[];
  opcionesRol: { valor: string; texto: string }[];
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
      <p v-if="esElMismo" class="text-sm text-tierra-500">No puede cambiar sus propios accesos.</p>
      <template v-else>
        <CampoInterruptor
          v-if="edicion.usuarioId"
          v-model="edicion.activo"
          etiqueta="Usuario activo"
          descripcion="Un usuario inactivo no puede iniciar sesión."
        />
        <fieldset class="space-y-3">
          <legend class="text-sm font-semibold">Acceso por empresa</legend>
          <p v-if="errores.accesos" class="text-sm text-red-700">{{ errores.accesos }}</p>
          <CampoSelector
            v-for="empresa in empresas"
            :key="empresa.id"
            v-model="edicion.rolPorEmpresa[empresa.id]"
            :etiqueta="empresa.nombre"
            :opciones="opcionesRol"
          />
        </fieldset>
      </template>
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-usuario" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
