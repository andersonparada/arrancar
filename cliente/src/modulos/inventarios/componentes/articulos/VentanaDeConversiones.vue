<script setup lang="ts">
import { Plus, Trash2 } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { opcionesDeRegistros } from '@/modulos/core/utilidades/edicion';
import type { EdicionDeConversiones } from '../../composables/articulos/edicion-de-conversiones';
import type { Unidad } from '../../servicios/unidades.api';

/** Cuántas unidades base trae cada unidad de empaque; solo una es la que propone la compra. */
defineProps<{
  unidadBase: string | null;
  errores: Record<string, string>;
  enviando: boolean;
  disponibles: (indice: number) => Unidad[];
}>();
const emit = defineEmits<{
  cerrar: [];
  guardar: [];
  agregar: [];
  quitar: [indice: number];
  'marcar-para-compras': [indice: number];
}>();
const edicion = defineModel<EdicionDeConversiones>({ required: true });
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" titulo="Conversiones del artículo" @cerrar="emit('cerrar')">
    <form id="form-conversiones" class="space-y-4" @submit.prevent="emit('guardar')">
      <p class="text-sm text-tierra-600 dark:text-tierra-300">
        Escriba cuántas {{ unidadBase ?? 'unidades base' }} trae una caja, un saco u otra unidad de empaque.
      </p>
      <p v-if="errores.conversiones" class="text-sm text-red-600" role="alert">{{ errores.conversiones }}</p>
      <div v-for="(fila, indice) in edicion.filas" :key="indice" class="grid grid-cols-[1fr_8rem_auto] items-end gap-2">
        <CampoSelector
          v-model="fila.unidadId"
          etiqueta="Unidad"
          :opciones="opcionesDeRegistros(disponibles(indice), (unidad) => unidad.nombre, true)"
        />
        <CampoTexto v-model="fila.factor" etiqueta="Trae" tipo="number" paso="any" requerido />
        <BotonBase variante="fantasma" pequeno :icono="Trash2" aria-label="Quitar" @click="emit('quitar', indice)" />
        <label class="col-span-3 -mt-1 flex items-center gap-2 text-sm">
          <input type="checkbox" :checked="fila.paraCompras" @change="emit('marcar-para-compras', indice)" />
          La que propone la compra
        </label>
      </div>
      <BotonBase variante="secundario" pequeno :icono="Plus" @click="emit('agregar')">Agregar unidad</BotonBase>
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-conversiones" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
