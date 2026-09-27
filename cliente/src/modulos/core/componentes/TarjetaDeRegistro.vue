<script setup lang="ts">
import { Pencil, Trash2 } from 'lucide-vue-next';
import type { DetalleDeRegistro } from '../tipos';
import BotonBase from './BotonBase.vue';
import InsigniaBase from './InsigniaBase.vue';
import TarjetaBase from './TarjetaBase.vue';

/**
 * La tarjeta de un registro en una lista: su nombre, sus datos y las acciones
 * de quien tiene `permiso`. Todas las listas generadas se ven así.
 */
defineProps<{
  titulo: string;
  detalles: DetalleDeRegistro[];
  permiso: string;
  inactivo?: boolean;
  eliminable?: boolean;
}>();
const emit = defineEmits<{ editar: []; eliminar: [] }>();
</script>

<template>
  <TarjetaBase class="flex h-full flex-col gap-3">
    <div class="flex items-start justify-between gap-2">
      <p class="min-w-0 truncate font-semibold">{{ titulo }}</p>
      <InsigniaBase v-if="inactivo" tono="rojo">Inactivo</InsigniaBase>
    </div>
    <dl v-if="detalles.length" class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
      <div v-for="detalle in detalles" :key="detalle.etiqueta" class="min-w-0">
        <dt class="text-xs text-tierra-500">{{ detalle.etiqueta }}</dt>
        <dd class="truncate">{{ detalle.valor }}</dd>
      </div>
    </dl>
    <div v-permiso="permiso" class="mt-auto flex justify-end gap-1">
      <BotonBase variante="fantasma" pequeno :icono="Pencil" @click="emit('editar')">Editar</BotonBase>
      <BotonBase v-if="eliminable" variante="fantasma" pequeno :icono="Trash2" @click="emit('eliminar')">
        Eliminar
      </BotonBase>
    </div>
  </TarjetaBase>
</template>
