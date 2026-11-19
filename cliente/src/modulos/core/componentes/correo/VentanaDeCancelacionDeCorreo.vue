<script setup lang="ts">
import BotonBase from '../BotonBase.vue';
import CampoTexto from '../CampoTexto.vue';
import VentanaModal from '../VentanaModal.vue';

/** Cancelar un correo pendiente: pide el motivo, que queda registrado en la auditoría. */
defineProps<{ abierta: boolean; asunto: string; errores: Record<string, string>; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; confirmar: [] }>();
const motivo = defineModel<string>({ required: true });
</script>

<template>
  <VentanaModal :abierta="abierta" titulo="Cancelar el envío" encima @cerrar="emit('cerrar')">
    <form id="form-cancelar-correo" class="space-y-4" novalidate @submit.prevent="emit('confirmar')">
      <p class="text-sm">
        El correo «{{ asunto }}» no saldrá. Esto no se puede deshacer; si hace falta, se envía de nuevo desde su origen.
      </p>
      <CampoTexto
        v-model="motivo"
        etiqueta="Motivo"
        requerido
        multilinea
        :longitud-maxima="300"
        contar
        ayuda="Por qué se cancela; queda registrado en la auditoría."
        :error="errores.motivo"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Volver</BotonBase>
      <BotonBase tipo="submit" form="form-cancelar-correo" variante="peligro" :cargando="enviando">
        Cancelar el envío
      </BotonBase>
    </template>
  </VentanaModal>
</template>
