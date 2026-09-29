<script setup lang="ts">
import { Pencil, Trash2 } from 'lucide-vue-next';
import type { Rol } from '../../servicios/roles.api';
import BotonBase from '../BotonBase.vue';
import InsigniaBase from '../InsigniaBase.vue';
import TarjetaBase from '../TarjetaBase.vue';

defineProps<{ rol: Rol; resumen: string }>();
const emit = defineEmits<{ editar: []; eliminar: [] }>();
</script>

<template>
  <TarjetaBase class="flex h-full flex-col gap-2">
    <div class="flex items-start justify-between gap-2">
      <div>
        <p class="font-semibold">{{ rol.nombre }}</p>
        <p v-if="rol.descripcion" class="text-sm text-tierra-600 dark:text-tierra-300">{{ rol.descripcion }}</p>
      </div>
      <InsigniaBase v-if="rol.accesoTotal" tono="trigo">Acceso total</InsigniaBase>
    </div>
    <p class="text-sm text-tierra-500">{{ resumen }}</p>
    <div class="mt-auto flex justify-end gap-1">
      <BotonBase v-permiso="'roles.editar'" variante="fantasma" pequeno :icono="Pencil" @click="emit('editar')"
        >Editar</BotonBase
      >
      <BotonBase
        v-permiso="'roles.eliminar'"
        variante="fantasma"
        pequeno
        :icono="Trash2"
        :deshabilitado="rol.totalUsuarios > 0"
        @click="emit('eliminar')"
        >Eliminar</BotonBase
      >
    </div>
  </TarjetaBase>
</template>
