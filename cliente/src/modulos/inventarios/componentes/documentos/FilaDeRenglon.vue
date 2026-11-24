<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { EdicionDeRenglon } from '../../composables/documentos/edicion-de-renglones';

/** Un renglón de entrada o salida: artículo, lote si lo maneja, cantidad con su unidad y, en entradas, el costo. */
defineProps<{
  indice: number;
  errores: Record<string, string>;
  opcionesDeArticulos: OpcionDeRegistro[];
  opcionesDeUnidades: OpcionDeRegistro[];
  opcionesDeLotes: OpcionDeRegistro[];
  manejaLotes: boolean;
  conCosto: boolean;
}>();
const renglon = defineModel<EdicionDeRenglon>({ required: true });
const emit = defineEmits<{ elegirArticulo: []; quitar: [] }>();

function elegirArticulo(valor: string | null | undefined): void {
  renglon.value.articuloId = valor ?? null;
  emit('elegirArticulo');
}
</script>

<template>
  <div class="space-y-3 rounded-xl bg-white p-3 ring-1 ring-tierra-200/70 dark:bg-tierra-800/60 dark:ring-tierra-700">
    <div class="flex items-start gap-2">
      <div class="min-w-0 flex-1">
        <CampoSelector
          :model-value="renglon.articuloId"
          :etiqueta="`Artículo ${indice + 1}`"
          :opciones="opcionesDeArticulos"
          requerido
          :error="errores[`renglones.${indice}.articuloId`]"
          @update:model-value="elegirArticulo"
        />
      </div>
      <BotonBase
        class="mt-6"
        variante="fantasma"
        :icono="Trash2"
        :aria-label="`Quitar el artículo ${indice + 1}`"
        @click="emit('quitar')"
      />
    </div>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <CampoSelector
        v-if="manejaLotes"
        v-model="renglon.loteId"
        etiqueta="Lote"
        :opciones="opcionesDeLotes"
        requerido
        :error="errores[`renglones.${indice}.loteId`]"
      />
      <CampoTexto
        v-model="renglon.cantidad"
        etiqueta="Cantidad"
        tipo="number"
        paso="any"
        requerido
        :error="errores[`renglones.${indice}.cantidad`]"
      />
      <CampoSelector
        v-if="opcionesDeUnidades.length > 1"
        v-model="renglon.unidadId"
        etiqueta="Unidad"
        :opciones="opcionesDeUnidades"
        :error="errores[`renglones.${indice}.unidadId`]"
      />
      <CampoTexto
        v-if="conCosto"
        v-model="renglon.costoTotal"
        etiqueta="Costo total (Q)"
        tipo="number"
        paso="any"
        :error="errores[`renglones.${indice}.costoTotal`]"
      />
    </div>
  </div>
</template>
