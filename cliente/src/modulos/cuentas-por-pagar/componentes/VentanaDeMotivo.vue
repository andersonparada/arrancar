<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionConMotivo } from '../composables/usar-baja-con-motivo';
import { MAXIMO_DEL_MOTIVO } from '../textos';

/** Deshacer algo (quitar una aplicación, anular un ajuste): dice qué pasará y pide el motivo, que queda registrado. */
defineProps<{
  titulo: string;
  textoDelBoton: string;
  errores: Record<string, string>;
  enviando: boolean;
}>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionConMotivo>({ required: true });
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" :titulo="titulo" @cerrar="emit('cerrar')">
    <form id="form-motivo-de-nota" class="space-y-4" @submit.prevent="emit('guardar')">
      <p class="text-sm">{{ edicion.resumen }}</p>
      <CampoTexto
        v-model="edicion.motivo"
        etiqueta="Motivo"
        requerido
        multilinea
        :longitud-maxima="MAXIMO_DEL_MOTIVO"
        ayuda="Por qué se hace; queda registrado en la auditoría."
        :error="errores.motivo"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-motivo-de-nota" variante="peligro" :cargando="enviando">
        {{ textoDelBoton }}
      </BotonBase>
    </template>
  </VentanaModal>
</template>
