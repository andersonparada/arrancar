<script setup lang="ts">
import { KeyRound, Pencil, ShieldCheck } from 'lucide-vue-next';
import type { Usuario } from '../../servicios/usuarios.api';
import { formatearFechaHora } from '../../utilidades/formato';
import BotonBase from '../BotonBase.vue';
import InsigniaBase from '../InsigniaBase.vue';
import TarjetaBase from '../TarjetaBase.vue';

/** `esElMismo` oculta «Permisos»: nadie cambia los suyos. */
defineProps<{ usuario: Usuario; nombre: string; esElMismo?: boolean }>();
const emit = defineEmits<{ editar: []; cambiarContrasena: []; permisos: [] }>();
</script>

<template>
  <TarjetaBase class="flex h-full flex-col gap-3">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="truncate font-semibold">{{ nombre }}</p>
        <p class="truncate font-mono text-sm text-tierra-500">{{ usuario.usuario }}</p>
        <p v-if="usuario.correo" class="truncate text-xs text-tierra-500">{{ usuario.correo }}</p>
      </div>
      <InsigniaBase :tono="usuario.activo ? 'campo' : 'rojo'">{{
        usuario.activo ? 'Activo' : 'Inactivo'
      }}</InsigniaBase>
    </div>
    <ul class="flex flex-wrap gap-1.5" aria-label="Empresas del usuario">
      <li v-for="empresa in usuario.empresas" :key="empresa.empresaId">
        <InsigniaBase>{{ empresa.empresaNombre }}</InsigniaBase>
      </li>
    </ul>
    <ul class="flex flex-wrap gap-1.5" aria-label="Roles y permisos del usuario">
      <li v-for="rol in usuario.roles" :key="rol.rolId">
        <InsigniaBase :tono="rol.accesoTotal ? 'trigo' : 'campo'">{{ rol.rolNombre }}</InsigniaBase>
      </li>
      <li v-if="usuario.totalPermisosDirectos">
        <InsigniaBase tono="trigo">+{{ usuario.totalPermisosDirectos }} permisos directos</InsigniaBase>
      </li>
      <li v-if="!usuario.roles.length && !usuario.totalPermisosDirectos" class="text-xs text-tierra-500">
        Sin roles ni permisos
      </li>
    </ul>
    <div class="mt-auto flex items-center justify-between gap-2 pt-1">
      <p class="text-xs text-tierra-500">Último acceso: {{ formatearFechaHora(usuario.ultimoAccesoEn) }}</p>
      <div class="flex gap-1">
        <BotonBase
          v-if="!esElMismo"
          v-permiso="'usuarios.asignar-permisos'"
          variante="fantasma"
          pequeno
          :icono="ShieldCheck"
          aria-label="Roles y permisos"
          title="Roles y permisos"
          @click="emit('permisos')"
        />
        <div v-permiso="'usuarios.editar'" class="flex gap-1">
          <BotonBase
            variante="fantasma"
            pequeno
            :icono="KeyRound"
            aria-label="Cambiar contraseña"
            title="Cambiar contraseña"
            @click="emit('cambiarContrasena')"
          />
          <BotonBase
            variante="fantasma"
            pequeno
            :icono="Pencil"
            aria-label="Editar usuario"
            title="Editar usuario"
            @click="emit('editar')"
          />
        </div>
      </div>
    </div>
  </TarjetaBase>
</template>
