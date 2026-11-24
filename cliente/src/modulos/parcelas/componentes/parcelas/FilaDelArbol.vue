<script setup lang="ts">
import { computed } from 'vue';
import { ChevronDown, ChevronRight } from 'lucide-vue-next';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import type { FilaDelArbol } from '../../composables/parcelas/arbol-de-parcelas';
import {
  insigniaDeParcela,
  resumenDeParcela,
  type MostrarSuperficie,
} from '../../composables/parcelas/detalles-de-parcela';

/**
 * Una parcela del árbol: su tarjeta con sangría según el nivel y, si tiene subparcelas, el botón para esconderlas o
 * mostrarlas. La sangría tiene tope para que en el celular la tarjeta siga cabiendo.
 */
const props = defineProps<{ fila: FilaDelArbol; mostrar: MostrarSuperficie }>();
const emit = defineEmits<{ alternar: [] }>();

const NIVELES_DE_SANGRIA = 4;
const sangria = computed(() => `${Math.min(props.fila.profundidad, NIVELES_DE_SANGRIA)}rem`);
const parcela = computed(() => props.fila.nodo);
const calculada = computed(() => ({
  metrosCuadrados: props.fila.superficieTotalM2,
  esSuma: props.fila.esSumaDeSubparcelas,
}));
const accion = computed(
  () => `${props.fila.colapsada ? 'Mostrar' : 'Esconder'} las subparcelas de ${parcela.value.nombre}`,
);
</script>

<template>
  <li class="flex items-stretch gap-1" :style="{ marginLeft: sangria }">
    <button
      v-if="fila.tieneHijas"
      type="button"
      class="flex w-9 shrink-0 items-center justify-center rounded-lg text-tierra-600 hover:bg-tierra-100 focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none dark:text-tierra-300 dark:hover:bg-tierra-800"
      :aria-expanded="!fila.colapsada"
      :aria-label="accion"
      :title="accion"
      @click="emit('alternar')"
    >
      <ChevronRight v-if="fila.colapsada" class="size-5" aria-hidden="true" />
      <ChevronDown v-else class="size-5" aria-hidden="true" />
    </button>
    <span v-else class="w-9 shrink-0" aria-hidden="true" />
    <div class="min-w-0 flex-1">
      <TarjetaDeRegistro
        :titulo="`${parcela.codigo} · ${parcela.nombre}`"
        :detalles="resumenDeParcela(parcela, mostrar, calculada)"
        permiso="parcelas.parcelas.editar"
        :inactivo="!parcela.activo"
        :insignia="insigniaDeParcela(parcela)"
        :destino="{ name: 'parcelas.parcelas.ficha', params: { parcelaId: parcela.id } }"
      />
    </div>
  </li>
</template>
