<script setup lang="ts">
import { computed } from 'vue';
import { Info, Trash2 } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import {
  MAXIMO_DEL_MOTIVO,
  opcionesDeCausa,
  type EdicionDeAnulacion,
} from '../../composables/documentos/reglas-de-baja-de-documento';
import type { TipoDeDocumento } from '../../servicios/documentos.api';
import { AYUDA_DE_ANULAR } from '../../textos-de-documentos';

/** `resumen` dice qué va a pasar; `puedeEliminar` (lo dice el servidor) ofrece borrar en vez de anular. */
const props = defineProps<{
  resumen: string;
  tipo: TipoDeDocumento;
  puedeEliminar: boolean;
  errores: Record<string, string>;
  enviando: boolean;
}>();
const emit = defineEmits<{ cerrar: []; guardar: []; eliminar: [] }>();
const edicion = defineModel<EdicionDeAnulacion>({ required: true });
const causas = computed(() => opcionesDeCausa(props.tipo));
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" titulo="Anular el registro" @cerrar="emit('cerrar')">
    <form id="form-anulacion" class="space-y-4" @submit.prevent="emit('guardar')">
      <p
        class="flex gap-2 rounded-lg bg-trigo-300/40 p-3 text-sm text-tierra-800 dark:bg-trigo-500/20 dark:text-trigo-300"
      >
        <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{{ AYUDA_DE_ANULAR }}</span>
      </p>
      <p class="text-sm">{{ resumen }}</p>
      <CampoSelector v-model="edicion.causa" etiqueta="Causa" requerido :opciones="causas" :error="errores.causa" />
      <CampoTexto
        v-model="edicion.motivo"
        etiqueta="Motivo"
        requerido
        multilinea
        :longitud-maxima="MAXIMO_DEL_MOTIVO"
        ayuda="Qué pasó, en pocas palabras."
        :error="errores.motivo"
      />
      <div
        v-if="puedeEliminar"
        v-permiso="'libro-de-compras.documentos.eliminar'"
        class="rounded-lg border border-dashed border-tierra-300 p-3 text-sm dark:border-tierra-600"
      >
        <p class="font-medium">¿Fue un error de captura? Elimínelo.</p>
        <p class="mt-1 text-tierra-600 dark:text-tierra-300">
          Mientras nadie lo haya procesado, puede borrarlo por completo en vez de dejarlo anulado.
        </p>
        <BotonBase class="mt-2" variante="secundario" pequeno :icono="Trash2" @click="emit('eliminar')">
          Eliminar en vez de anular
        </BotonBase>
      </div>
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-anulacion" variante="peligro" :cargando="enviando">
        Anular el registro
      </BotonBase>
    </template>
  </VentanaModal>
</template>
