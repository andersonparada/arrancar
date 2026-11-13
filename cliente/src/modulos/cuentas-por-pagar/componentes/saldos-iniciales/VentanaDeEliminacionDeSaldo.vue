<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';

/** Eliminar un saldo inicial: `resumen` dice qué va a pasar y el motivo es obligatorio (queda en la auditoría). */
defineProps<{
  abierta: boolean;
  resumen: string;
  maximo: number;
  errores: Record<string, string>;
  enviando: boolean;
}>();
const emit = defineEmits<{ cerrar: []; confirmar: [] }>();
const motivo = defineModel<string>('motivo', { required: true });
</script>

<template>
  <VentanaModal :abierta="abierta" titulo="Eliminar saldo inicial" @cerrar="emit('cerrar')">
    <form id="form-eliminar-saldo" class="space-y-4" @submit.prevent="emit('confirmar')">
      <p class="text-sm">{{ resumen }}</p>
      <CampoTexto
        v-model="motivo"
        etiqueta="Motivo"
        multilinea
        requerido
        :longitud-maxima="maximo"
        ayuda="Qué pasó, en pocas palabras."
        :error="errores.motivo"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-eliminar-saldo" variante="peligro" :cargando="enviando">Eliminar</BotonBase>
    </template>
  </VentanaModal>
</template>
