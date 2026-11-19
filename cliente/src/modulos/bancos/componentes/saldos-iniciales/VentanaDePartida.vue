<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import {
  tituloDeLaVentanaDePartida,
  type EdicionDePartida,
} from '../../composables/saldos-iniciales/edicion-de-partida';
import CamposDePartida from './CamposDePartida.vue';

/** Agregar o corregir una partida de apertura: el título dice cuál (cheque, depósito, débito, error, posfechado). */
defineProps<{
  errores: Record<string, string>;
  enviando: boolean;
  corte: string;
  corteLegible: string;
  opcionesDeConcepto: OpcionDeRegistro[];
}>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDePartida>({ required: true });
const titulo = computed(() => tituloDeLaVentanaDePartida(edicion.value));
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" :titulo="titulo" @cerrar="emit('cerrar')">
    <form id="form-de-partida" @submit.prevent="emit('guardar')">
      <CamposDePartida
        v-model="edicion"
        :errores="errores"
        :corte="corte"
        :corte-legible="corteLegible"
        :opciones-de-concepto="opcionesDeConcepto"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-de-partida" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
