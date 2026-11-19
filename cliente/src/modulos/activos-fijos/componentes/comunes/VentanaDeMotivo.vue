<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';

/**
 * Ventana para anular o descartar algo: explica con `texto` qué pasará y pide el motivo, obligatorio, que queda en
 * la auditoría. El botón dice lo que hace («Anular costo», «Descartar línea»).
 */
defineProps<{
  abierta: boolean;
  titulo: string;
  texto: string;
  accion: string;
  errores: Record<string, string>;
  enviando: boolean;
}>();
const emit = defineEmits<{ cerrar: []; confirmar: [] }>();
const motivo = defineModel<string>('motivo', { required: true });
</script>

<template>
  <VentanaModal :abierta="abierta" :titulo="titulo" @cerrar="emit('cerrar')">
    <form id="form-de-motivo" class="space-y-4" @submit.prevent="emit('confirmar')">
      <p class="text-sm text-tierra-600 dark:text-tierra-300">{{ texto }}</p>
      <CampoTexto
        v-model="motivo"
        etiqueta="Motivo"
        multilinea
        requerido
        :longitud-maxima="300"
        contar
        ayuda="Queda en la auditoría: escriba lo que necesitaría leer quien lo revise después."
        :error="errores.motivo"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-de-motivo" variante="peligro" :cargando="enviando">{{ accion }}</BotonBase>
    </template>
  </VentanaModal>
</template>
