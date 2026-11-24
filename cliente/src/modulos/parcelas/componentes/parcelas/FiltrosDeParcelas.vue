<script setup lang="ts">
import { computed } from 'vue';
import { ChevronsDownUp, ChevronsUpDown, X } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { FiltrosDeLaLista } from '../../composables/parcelas/usar-arbol-de-parcelas';

/**
 * Lo que acota la lista: la localidad, un texto (código o nombre) y si se ven las inactivas; y los botones para
 * esconder o mostrar todas las subparcelas de golpe.
 */
const props = defineProps<{
  localidades: { id: string; nombre: string }[];
  hayFiltros: boolean;
  hayConHijas: boolean;
}>();
const emit = defineEmits<{ limpiar: []; contraer: []; expandir: [] }>();
const filtros = defineModel<FiltrosDeLaLista>({ required: true });

const opciones = computed(() => [
  { valor: null, texto: 'Todas las localidades' },
  ...[...props.localidades]
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    .map(({ id, nombre }) => ({ valor: id, texto: nombre })),
]);
</script>

<template>
  <div class="mb-4 space-y-3" role="search" aria-label="Filtrar parcelas">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <CampoSelector v-model="filtros.localidadId" etiqueta="Localidad" :opciones="opciones" />
      <CampoTexto v-model="filtros.texto" etiqueta="Buscar por código o nombre" tipo="search" sin-correccion />
    </div>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <CampoInterruptor v-model="filtros.verInactivas" etiqueta="Mostrar también las inactivas" class="max-w-xs" />
      <div class="flex flex-wrap gap-2">
        <BotonBase v-if="hayConHijas" variante="fantasma" pequeno :icono="ChevronsDownUp" @click="emit('contraer')">
          Esconder subparcelas
        </BotonBase>
        <BotonBase v-if="hayConHijas" variante="fantasma" pequeno :icono="ChevronsUpDown" @click="emit('expandir')">
          Mostrar todas
        </BotonBase>
        <BotonBase v-if="hayFiltros" variante="fantasma" pequeno :icono="X" @click="emit('limpiar')">
          Quitar filtros
        </BotonBase>
      </div>
    </div>
  </div>
</template>
