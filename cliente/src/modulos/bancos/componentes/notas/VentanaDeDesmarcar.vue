<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { TEXTO_DE_DESMARCADO } from '../../composables/notas/marca-de-nota';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';

/** Quitar la marca de una nota: explica qué pasa y pide el concepto con que sigue y el motivo (queda en la auditoría). */
defineProps<{
  abierta: boolean;
  opciones: OpcionDeRegistro[];
  errores: Record<string, string>;
  enviando: boolean;
}>();
const emit = defineEmits<{ cerrar: []; confirmar: [] }>();
const motivo = defineModel<string>('motivo', { required: true });
const conceptoId = defineModel<string | null>('conceptoId', { required: true });
</script>

<template>
  <VentanaModal :abierta="abierta" titulo="Quitar la marca de la nota" @cerrar="emit('cerrar')">
    <form id="form-de-desmarcar" class="space-y-4" @submit.prevent="emit('confirmar')">
      <p class="text-sm text-tierra-600 dark:text-tierra-300">{{ TEXTO_DE_DESMARCADO }}</p>
      <CampoSelector
        v-model="conceptoId"
        etiqueta="Concepto con el que sigue"
        :opciones="opciones"
        requerido
        :error="errores.conceptoId"
      />
      <CampoTexto v-model="motivo" etiqueta="Motivo" multilinea requerido :error="errores.motivo" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-de-desmarcar" :cargando="enviando">Quitar la marca</BotonBase>
    </template>
  </VentanaModal>
</template>
