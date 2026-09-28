<script setup lang="ts">
import { ChevronRight, Pencil, Trash2 } from 'lucide-vue-next';
import { RouterLink, type RouteLocationRaw } from 'vue-router';
import type { DetalleDeRegistro } from '../tipos';
import BotonBase from './BotonBase.vue';
import InsigniaBase from './InsigniaBase.vue';
import TarjetaBase from './TarjetaBase.vue';

/**
 * La tarjeta de un registro en una lista: su nombre, sus datos y las acciones
 * de quien tiene `permiso`. Todas las listas generadas se ven así. Con `destino`
 * toda la tarjeta lleva a su ficha, y editar o eliminar se hacen allí.
 */
defineProps<{
  titulo: string;
  detalles: DetalleDeRegistro[];
  permiso: string;
  inactivo?: boolean;
  eliminable?: boolean;
  destino?: RouteLocationRaw;
}>();
const emit = defineEmits<{ editar: []; eliminar: [] }>();
</script>

<template>
  <component
    :is="destino ? RouterLink : 'div'"
    :to="destino"
    class="block h-full rounded-2xl focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none"
    :class="destino ? 'transition hover:-translate-y-0.5 hover:shadow-md' : ''"
  >
    <TarjetaBase class="flex h-full flex-col gap-3">
      <div class="flex items-start justify-between gap-2">
        <p class="min-w-0 truncate font-semibold">{{ titulo }}</p>
        <InsigniaBase v-if="inactivo" tono="rojo">Inactivo</InsigniaBase>
        <ChevronRight v-else-if="destino" class="size-4 shrink-0 text-tierra-400" aria-hidden="true" />
      </div>
      <dl v-if="detalles.length" class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        <div v-for="detalle in detalles" :key="detalle.etiqueta" class="min-w-0">
          <dt class="text-xs text-tierra-500">{{ detalle.etiqueta }}</dt>
          <dd class="truncate">{{ detalle.valor }}</dd>
        </div>
      </dl>
      <div v-if="!destino" v-permiso="permiso" class="mt-auto flex justify-end gap-1">
        <BotonBase variante="fantasma" pequeno :icono="Pencil" @click="emit('editar')">Editar</BotonBase>
        <BotonBase v-if="eliminable" variante="fantasma" pequeno :icono="Trash2" @click="emit('eliminar')">
          Eliminar
        </BotonBase>
      </div>
    </TarjetaBase>
  </component>
</template>
