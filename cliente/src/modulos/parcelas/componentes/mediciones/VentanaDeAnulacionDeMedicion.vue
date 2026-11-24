<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { formatearFecha } from '@/modulos/core/utilidades/formato';
import { mensajeDeAnulacion } from '../../composables/mediciones/edicion-de-medicion';
import type { AnulacionEnCurso } from '../../composables/mediciones/usar-mediciones-de-parcela';

defineProps<{ errores: Record<string, string>; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; anular: [] }>();
const anulacion = defineModel<AnulacionEnCurso>({ required: true });
const resumen = computed(() =>
  anulacion.value.medicion ? mensajeDeAnulacion(formatearFecha(anulacion.value.medicion.vigenteDesde)) : '',
);
</script>

<template>
  <VentanaModal :abierta="anulacion.abierta" titulo="Anular medición" @cerrar="emit('cerrar')">
    <form id="form-anular-medicion" class="space-y-4" @submit.prevent="emit('anular')">
      <p class="text-sm">{{ resumen }}</p>
      <CampoTexto
        v-model="anulacion.motivo"
        etiqueta="Motivo"
        requerido
        multilinea
        :longitud-maxima="300"
        :error="errores.motivo"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" variante="peligro" form="form-anular-medicion" :cargando="enviando">
        Anular medición
      </BotonBase>
    </template>
  </VentanaModal>
</template>
