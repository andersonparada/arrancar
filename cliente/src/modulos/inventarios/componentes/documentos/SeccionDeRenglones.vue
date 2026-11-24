<script setup lang="ts">
import { ref } from 'vue';
import { Plus, ScanBarcode } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { EdicionDeRenglon } from '../../composables/documentos/edicion-de-renglones';
import type { CatalogoDeRenglones } from '../../composables/documentos/usar-catalogo-de-renglones';
import FilaDeRenglon from './FilaDeRenglon.vue';

/**
 * Los renglones del documento. Arriba, un campo para el lector de códigos de barras (el lector escribe el código y
 * pulsa Intro): cada lectura agrega el artículo o suma uno a su cantidad.
 */
defineProps<{
  renglones: EdicionDeRenglon[];
  catalogo: CatalogoDeRenglones;
  errores: Record<string, string>;
  conCosto: boolean;
}>();
const emit = defineEmits<{
  agregar: [];
  quitar: [indice: number];
  elegirArticulo: [renglon: EdicionDeRenglon];
  leer: [codigo: string];
}>();
const codigo = ref('');

function leer(): void {
  if (!codigo.value.trim()) return;
  emit('leer', codigo.value);
  codigo.value = '';
}
</script>

<template>
  <section aria-labelledby="titulo-de-renglones" class="space-y-3">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <h2 id="titulo-de-renglones" class="font-semibold">Artículos</h2>
      <div class="flex min-w-0 flex-1 items-end gap-2 sm:max-w-sm">
        <div class="min-w-0 flex-1" @keydown.enter.prevent="leer">
          <CampoTexto
            v-model="codigo"
            etiqueta="Código de barras o código"
            sin-correccion
            placeholder="Escanee o escriba y pulse Intro"
          />
        </div>
        <BotonBase
          variante="secundario"
          :icono="ScanBarcode"
          aria-label="Agregar el artículo del código"
          @click="leer"
        />
      </div>
    </div>
    <p v-if="errores.renglones" role="alert" class="text-sm text-red-700 dark:text-red-300">{{ errores.renglones }}</p>
    <ul class="space-y-3">
      <li v-for="(renglon, indice) in renglones" :key="renglon.clave">
        <FilaDeRenglon
          :model-value="renglon"
          :indice="indice"
          :errores="errores"
          :opciones-de-articulos="catalogo.opcionesDeArticulos.value"
          :opciones-de-unidades="catalogo.opcionesDeUnidadesDe(renglon.articuloId)"
          :opciones-de-lotes="catalogo.opcionesDeLotesDe(renglon.articuloId)"
          :maneja-lotes="catalogo.articuloDe(renglon.articuloId)?.manejaLotes ?? false"
          :con-costo="conCosto"
          @elegir-articulo="emit('elegirArticulo', renglon)"
          @quitar="emit('quitar', indice)"
        />
      </li>
    </ul>
    <BotonBase variante="secundario" :icono="Plus" @click="emit('agregar')">Agregar otro artículo</BotonBase>
  </section>
</template>
