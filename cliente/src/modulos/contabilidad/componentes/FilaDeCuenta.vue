<script setup lang="ts">
import { ChevronDown, ChevronRight, Pencil, Plus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import type { FilaDeCuenta } from '../composables/arbol-de-cuentas';
import { NATURALEZAS } from '../textos';

/** Una cuenta del árbol: plegar o abrir sus inferiores, agregarle una cuenta inferior o editarla. */
defineProps<{ fila: FilaDeCuenta; puedeEditar: boolean; puedeCrear: boolean; admiteSubcuentas: boolean }>();
const emit = defineEmits<{ alternar: []; editar: []; agregar: [] }>();
</script>

<template>
  <li
    class="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 pr-1"
    :style="{ paddingLeft: `${Math.min(fila.profundidad, 5) * 1.25}rem` }"
    :class="{ 'opacity-70': !fila.cuenta.activo }"
  >
    <button
      v-if="fila.tieneHijas"
      type="button"
      class="grid size-8 shrink-0 place-items-center rounded-lg text-tierra-600 hover:bg-tierra-100 dark:text-tierra-300 dark:hover:bg-tierra-800"
      :aria-expanded="fila.abierta"
      :aria-label="`${fila.abierta ? 'Plegar' : 'Abrir'} ${fila.cuenta.codigo} ${fila.cuenta.nombre}`"
      @click="emit('alternar')"
    >
      <component :is="fila.abierta ? ChevronDown : ChevronRight" class="size-4" aria-hidden="true" />
    </button>
    <span v-else class="size-8 shrink-0" aria-hidden="true" />

    <span class="min-w-0 flex-1 basis-48">
      <span class="font-mono text-sm text-tierra-600 dark:text-tierra-300">{{ fila.cuenta.codigo }}</span>
      <span class="ml-2 break-words" :class="fila.cuenta.esDeDetalle ? '' : 'font-semibold'">
        {{ fila.cuenta.nombre }}
      </span>
    </span>

    <span class="flex flex-wrap items-center gap-1.5">
      <InsigniaBase>{{ NATURALEZAS[fila.cuenta.naturaleza] }}</InsigniaBase>
      <InsigniaBase v-if="fila.cuenta.esDeDetalle" tono="campo">Detalle</InsigniaBase>
      <InsigniaBase v-if="fila.cuenta.esDeControl" tono="trigo">Control</InsigniaBase>
      <InsigniaBase v-if="!fila.cuenta.activo" tono="rojo">Inactiva</InsigniaBase>
    </span>

    <span class="flex gap-1">
      <BotonBase
        v-if="puedeCrear && admiteSubcuentas"
        variante="fantasma"
        pequeno
        :icono="Plus"
        :aria-label="`Agregar cuenta inferior a ${fila.cuenta.codigo} ${fila.cuenta.nombre}`"
        @click="emit('agregar')"
      />
      <BotonBase
        v-if="puedeEditar"
        variante="fantasma"
        pequeno
        :icono="Pencil"
        :aria-label="`Editar ${fila.cuenta.codigo} ${fila.cuenta.nombre}`"
        @click="emit('editar')"
      />
    </span>
  </li>
</template>
