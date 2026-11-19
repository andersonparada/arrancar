<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeMotivo } from '../composables/edicion-de-motivo';
import { AYUDA_DE_LA_FECHA, MAXIMO_DEL_MOTIVO } from '../textos';

/** Una acción que pide el motivo (anular, devolver): dice qué va a pasar y el motivo queda en la auditoría. */
defineProps<{
  abierta: boolean;
  titulo: string;
  /** Qué va a pasar si confirma, en una o dos frases. */
  resumen: string;
  textoDelBoton: string;
  enviando: boolean;
  errores: Record<string, string>;
  /** Con fecha opcional (anular una apertura: el inverso en Bancos). */
  conFecha?: boolean;
}>();
const edicion = defineModel<EdicionDeMotivo>({ required: true });
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
</script>

<template>
  <VentanaModal :abierta="abierta" :titulo="titulo" @cerrar="emit('cerrar')">
    <form id="form-de-motivo" class="space-y-4" novalidate @submit.prevent="emit('guardar')">
      <p class="text-sm" role="note">{{ resumen }}</p>
      <CampoTexto
        v-model="edicion.motivo"
        etiqueta="Motivo"
        requerido
        multilinea
        :longitud-maxima="MAXIMO_DEL_MOTIVO"
        ayuda="Por qué se hace; queda registrado en la auditoría."
        :error="errores.motivo"
      />
      <CampoTexto
        v-if="conFecha"
        v-model="edicion.fecha"
        etiqueta="Fecha"
        tipo="date"
        :ayuda="AYUDA_DE_LA_FECHA"
        :error="errores.fecha"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-de-motivo" variante="peligro" :cargando="enviando">
        {{ textoDelBoton }}
      </BotonBase>
    </template>
  </VentanaModal>
</template>
