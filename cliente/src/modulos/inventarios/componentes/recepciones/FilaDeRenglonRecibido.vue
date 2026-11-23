<script setup lang="ts">
import { SplitSquareHorizontal, Trash2 } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { EdicionDeRenglonRecibido } from '../../composables/recepciones/edicion-de-recepcion';

/**
 * Lo que se recibe de una línea del libro: artículo, lote (uno que ya existe o uno nuevo), cantidad con su unidad y
 * la parte del costo de la línea. Con «Repartir» una línea que trae varios artículos se divide en renglones.
 */
const props = defineProps<{
  indice: number;
  errores: Record<string, string>;
  opcionesDeArticulos: OpcionDeRegistro[];
  opcionesDeUnidades: OpcionDeRegistro[];
  opcionesDeLotes: OpcionDeRegistro[];
  manejaLotes: boolean;
  vencimientoObligatorio: boolean;
}>();
const renglon = defineModel<EdicionDeRenglonRecibido>({ required: true });
const emit = defineEmits<{ elegirArticulo: []; dividir: []; quitar: [] }>();

const error = (campo: string) => props.errores[`renglones.${props.indice}.${campo}`];

function elegirArticulo(valor: string | null | undefined): void {
  Object.assign(renglon.value, { articuloId: valor ?? null, loteId: null, unidadId: null });
  emit('elegirArticulo');
}
</script>

<template>
  <div class="space-y-3 rounded-xl p-3 ring-1 ring-tierra-200 dark:ring-tierra-700">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="font-medium">{{ renglon.titulo }}</p>
        <p class="text-xs text-tierra-500">
          {{ renglon.proveedor }} · Pendiente de la línea: {{ formatearMonto(renglon.pendiente) }}
        </p>
      </div>
      <div class="flex gap-1">
        <BotonBase variante="fantasma" pequeno :icono="SplitSquareHorizontal" @click="emit('dividir')">
          Repartir
        </BotonBase>
        <BotonBase
          variante="fantasma"
          pequeno
          :icono="Trash2"
          :aria-label="`Quitar el renglón ${indice + 1}`"
          @click="emit('quitar')"
        />
      </div>
    </div>
    <div class="grid gap-3 sm:grid-cols-2">
      <CampoSelector
        :model-value="renglon.articuloId"
        etiqueta="Artículo"
        :opciones="opcionesDeArticulos"
        requerido
        :error="error('articuloId')"
        @update:model-value="elegirArticulo"
      />
      <CampoTexto
        v-model="renglon.cantidad"
        etiqueta="Cantidad recibida"
        tipo="number"
        paso="any"
        requerido
        :error="error('cantidad')"
      />
      <CampoSelector
        v-if="opcionesDeUnidades.length > 1"
        v-model="renglon.unidadId"
        etiqueta="Unidad"
        :opciones="opcionesDeUnidades"
        :error="error('unidadId')"
      />
      <CampoTexto
        v-model="renglon.monto"
        etiqueta="Costo que recibe (Q)"
        tipo="number"
        paso="any"
        requerido
        :error="error('monto')"
      />
    </div>
    <div v-if="manejaLotes" class="space-y-3">
      <CampoInterruptor v-model="renglon.conLoteNuevo" etiqueta="Es un lote nuevo" />
      <div v-if="renglon.conLoteNuevo" class="grid gap-3 sm:grid-cols-2">
        <CampoTexto
          v-model="renglon.loteCodigo"
          etiqueta="Código del lote"
          sin-correccion
          requerido
          :error="error('loteNuevo')"
        />
        <CampoTexto
          v-model="renglon.loteVencimiento"
          etiqueta="Vence"
          tipo="date"
          :requerido="vencimientoObligatorio"
          :error="error('loteNuevo')"
        />
      </div>
      <CampoSelector
        v-else
        v-model="renglon.loteId"
        etiqueta="Lote"
        :opciones="opcionesDeLotes"
        :error="error('loteId')"
      />
    </div>
  </div>
</template>
