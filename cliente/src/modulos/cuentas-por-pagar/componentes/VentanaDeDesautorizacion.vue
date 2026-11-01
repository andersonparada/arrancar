<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { MAXIMO_DEL_MOTIVO } from '../textos';

/** Devolver un documento autorizado a «Por autorizar»: el motivo queda en la auditoría. */
defineProps<{ resumen: string; errores: Record<string, string>; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<{ abierta: boolean; motivo: string }>({ required: true });
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" titulo="Desautorizar el documento" @cerrar="emit('cerrar')">
    <form id="form-desautorizacion" class="space-y-4" @submit.prevent="emit('guardar')">
      <p class="text-sm">{{ resumen }}</p>
      <CampoTexto
        v-model="edicion.motivo"
        etiqueta="Motivo"
        requerido
        multilinea
        :longitud-maxima="MAXIMO_DEL_MOTIVO"
        ayuda="Por qué se devuelve; queda registrado."
        :error="errores.motivo"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-desautorizacion" :cargando="enviando">Desautorizar</BotonBase>
    </template>
  </VentanaModal>
</template>
