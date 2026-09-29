<script setup lang="ts">
import { ChevronRight, Pencil, Trash2 } from 'lucide-vue-next';
import { RouterLink, type RouteLocationRaw } from 'vue-router';
import type { DetalleDeRegistro } from '../tipos';
import BotonBase from './BotonBase.vue';
import InsigniaBase from './InsigniaBase.vue';
import TarjetaBase from './TarjetaBase.vue';

/**
 * La tarjeta de un registro en una lista: su nombre, sus datos y las acciones
 * de quien tiene `permiso` (editar) y, para eliminar, `permisoEliminar` (por omisión, el mismo). Todas las listas generadas se ven así. Con `destino`
 * toda la tarjeta lleva a su ficha, y editar o eliminar se hacen allí.
 *
 * `destacado` (slot) muestra algo propio del registro junto al título (p. ej. un
 * monto con color); `insignia` es una marca de texto junto al título, además de
 * "Inactivo"; `soloLectura` oculta editar/eliminar aunque haya permiso, y
 * `acciones-extra` (slot) agrega botones propios (p. ej. "Anular") sin duplicar
 * la tarjeta.
 */
defineProps<{
  titulo: string;
  detalles: DetalleDeRegistro[];
  /** Permiso de editar. */
  permiso: string;
  /** Permiso de eliminar, si es distinto del de editar. */
  permisoEliminar?: string;
  inactivo?: boolean;
  eliminable?: boolean;
  destino?: RouteLocationRaw;
  insignia?: string;
  soloLectura?: boolean;
  /** Oculta solo "Editar" (y "Eliminar"), a diferencia de `soloLectura` que también oculta `acciones-extra`. */
  sinEditar?: boolean;
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
        <div class="min-w-0">
          <p class="truncate font-semibold">{{ titulo }}</p>
          <slot name="destacado" />
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <InsigniaBase v-if="inactivo" tono="rojo">Inactivo</InsigniaBase>
          <InsigniaBase v-else-if="insignia" tono="tierra">{{ insignia }}</InsigniaBase>
          <ChevronRight v-if="destino" class="size-4 shrink-0 text-tierra-400" aria-hidden="true" />
        </div>
      </div>
      <dl v-if="detalles.length" class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        <div v-for="detalle in detalles" :key="detalle.etiqueta" class="min-w-0">
          <dt class="text-xs text-tierra-500">{{ detalle.etiqueta }}</dt>
          <dd class="truncate">{{ detalle.valor }}</dd>
        </div>
      </dl>
      <div v-if="!destino && !soloLectura" class="mt-auto flex justify-end gap-1">
        <template v-if="!sinEditar">
          <span v-permiso="permiso" class="contents">
            <BotonBase variante="fantasma" pequeno :icono="Pencil" @click="emit('editar')">Editar</BotonBase>
          </span>
          <span v-if="eliminable" v-permiso="permisoEliminar ?? permiso" class="contents">
            <BotonBase variante="fantasma" pequeno :icono="Trash2" @click="emit('eliminar')">Eliminar</BotonBase>
          </span>
        </template>
        <slot name="acciones-extra" />
      </div>
    </TarjetaBase>
  </component>
</template>
