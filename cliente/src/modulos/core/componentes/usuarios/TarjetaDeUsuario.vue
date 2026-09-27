<script setup lang="ts">
import { KeyRound, Pencil } from 'lucide-vue-next';
import type { Usuario } from '../../servicios/usuarios.api';
import { formatearFechaHora } from '../../utilidades/formato';
import BotonBase from '../BotonBase.vue';
import InsigniaBase from '../InsigniaBase.vue';
import TarjetaBase from '../TarjetaBase.vue';

defineProps<{ usuario: Usuario; nombre: string }>();
const emit = defineEmits<{ editar: []; cambiarContrasena: [] }>();
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
    <ul class="flex flex-wrap gap-1.5">
      <li v-for="acceso in usuario.accesos" :key="acceso.empresaId">
        <InsigniaBase>{{ acceso.empresaNombre }} · {{ acceso.rolNombre }}</InsigniaBase>
      </li>
    </ul>
    <div class="mt-auto flex items-center justify-between gap-2 pt-1">
      <p class="text-xs text-tierra-500">Último acceso: {{ formatearFechaHora(usuario.ultimoAccesoEn) }}</p>
      <div v-permiso="'usuarios.gestionar'" class="flex gap-1">
        <BotonBase
          variante="fantasma"
          pequeno
          :icono="KeyRound"
          aria-label="Cambiar contraseña"
          @click="emit('cambiarContrasena')"
        />
        <BotonBase variante="fantasma" pequeno :icono="Pencil" aria-label="Editar usuario" @click="emit('editar')" />
      </div>
    </div>
  </TarjetaBase>
</template>
