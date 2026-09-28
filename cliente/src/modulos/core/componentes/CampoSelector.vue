<script setup lang="ts" generic="T extends string | number | null">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue';
import { Check, ChevronDown, Search } from 'lucide-vue-next';
import { usarSelectorConBusqueda } from '../composables/usar-selector-con-busqueda';
import { usarPosicionFlotante } from '../composables/usar-posicion-flotante';

const props = defineProps<{
  etiqueta: string;
  opciones: { valor: T; texto: string }[];
  error?: string;
  requerido?: boolean;
  ocultarEtiqueta?: boolean;
  /** Se ve pero no se puede cambiar (p. ej. la cuenta de un movimiento al corregirlo). */
  deshabilitado?: boolean;
}>();

const modelo = defineModel<T>();
const id = useId();
const idLista = `${id}-lista`;
const idDeOpcion = (indice: number): string => `${id}-opcion-${indice}`;

const opcionesRef = computed(() => props.opciones);
const selector = usarSelectorConBusqueda(opcionesRef, modelo);

const boton = ref<HTMLButtonElement | null>(null);
const raiz = ref<HTMLElement | null>(null);
const campoBusqueda = ref<HTMLInputElement | null>(null);
const { estilo: estiloDelPanel } = usarPosicionFlotante(boton, selector.abierto);

function alHacerClicFuera(evento: MouseEvent): void {
  if (!selector.abierto.value || raiz.value?.contains(evento.target as Node)) return;
  selector.cerrar();
}

onMounted(() => document.addEventListener('mousedown', alHacerClicFuera));
onBeforeUnmount(() => document.removeEventListener('mousedown', alHacerClicFuera));

watch(selector.abierto, async (abierto) => {
  if (!abierto) return;
  await nextTick();
  (selector.muestraBuscador.value ? campoBusqueda.value : boton.value)?.focus();
});

function alPresionarTecla(evento: KeyboardEvent): void {
  selector.alPresionarTecla(evento);
  if (evento.key === 'Escape' || evento.key === 'Enter') boton.value?.focus();
}

function elegir(opcion: { valor: T; texto: string }): void {
  selector.elegir(opcion);
  boton.value?.focus();
}
</script>

<template>
  <div ref="raiz" class="flex flex-col gap-1.5">
    <label :for="id" :class="ocultarEtiqueta ? 'sr-only' : 'text-sm font-medium text-tierra-700 dark:text-tierra-200'">
      {{ etiqueta }}<span v-if="requerido" class="text-red-600" aria-hidden="true"> *</span>
    </label>
    <div class="relative">
      <button
        :id="id"
        ref="boton"
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        :aria-expanded="selector.abierto.value"
        :aria-controls="idLista"
        :aria-activedescendant="selector.indiceActivo.value >= 0 ? idDeOpcion(selector.indiceActivo.value) : undefined"
        :disabled="deshabilitado"
        :aria-invalid="!!error"
        class="flex w-full items-center justify-between gap-2 truncate rounded-lg border-0 bg-white px-3 py-2.5 text-left text-base ring-1 ring-tierra-200 focus:ring-2 focus:ring-campo-500 aria-invalid:ring-red-500 disabled:cursor-not-allowed disabled:bg-tierra-100 disabled:text-tierra-600 sm:text-sm dark:bg-tierra-800 dark:ring-tierra-700 dark:disabled:bg-tierra-900"
        @click="selector.abierto.value ? selector.cerrar() : selector.abrir()"
        @keydown="alPresionarTecla"
      >
        <span class="truncate">{{ selector.textoElegido.value }}</span>
        <ChevronDown class="size-4 shrink-0 text-tierra-400" aria-hidden="true" />
      </button>

      <Teleport to="body">
        <div
          v-if="selector.abierto.value"
          :style="estiloDelPanel ?? undefined"
          class="z-50 flex max-h-72 flex-col overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-tierra-200 dark:bg-tierra-800 dark:ring-tierra-700"
        >
          <div
            v-if="selector.muestraBuscador.value"
            class="flex items-center gap-2 border-b border-tierra-100 px-3 py-2 dark:border-tierra-700"
          >
            <Search class="size-4 shrink-0 text-tierra-400" aria-hidden="true" />
            <input
              ref="campoBusqueda"
              v-model="selector.busqueda.value"
              type="text"
              placeholder="Buscar…"
              class="w-full border-0 bg-transparent p-0 text-base focus:ring-0 sm:text-sm"
              @keydown="alPresionarTecla"
            />
          </div>
          <ul :id="idLista" role="listbox" :aria-label="etiqueta" class="overflow-y-auto py-1">
            <li
              v-for="(opcion, indice) in selector.opcionesFiltradas.value"
              :id="idDeOpcion(indice)"
              :key="String(opcion.valor)"
              role="option"
              :aria-selected="opcion.valor === modelo"
              class="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm text-tierra-800 dark:text-tierra-100"
              :class="indice === selector.indiceActivo.value ? 'bg-campo-50 dark:bg-tierra-700' : ''"
              @click="elegir(opcion)"
            >
              <span class="truncate">{{ opcion.texto }}</span>
              <Check v-if="opcion.valor === modelo" class="size-4 shrink-0 text-campo-600" aria-hidden="true" />
            </li>
            <li v-if="selector.opcionesFiltradas.value.length === 0" class="px-3 py-2 text-sm text-tierra-500">
              Sin resultados
            </li>
          </ul>
        </div>
      </Teleport>
    </div>
    <p v-if="error" class="text-sm text-red-700 dark:text-red-400">{{ error }}</p>
  </div>
</template>
