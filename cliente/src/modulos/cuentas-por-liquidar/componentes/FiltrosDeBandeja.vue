<script setup lang="ts">
import { FilterX } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { cantidadDeFiltrosDeBandeja, type FiltrosDeBandeja } from '../composables/bandeja/bandeja';

/** Acotar la bandeja por la fecha del documento y por si lleva retención. */
const filtros = defineModel<FiltrosDeBandeja>({ required: true });
defineEmits<{ quitar: [] }>();
</script>

<template>
  <TarjetaBase class="mb-4">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <CampoTexto v-model="filtros.desde" etiqueta="Documentos desde" tipo="date" />
      <CampoTexto v-model="filtros.hasta" etiqueta="Documentos hasta" tipo="date" />
    </div>
    <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
      <CampoInterruptor v-model="filtros.soloConRetencion" etiqueta="Solo los que llevan retención" />
      <BotonBase
        v-if="cantidadDeFiltrosDeBandeja(filtros) > 0"
        variante="fantasma"
        pequeno
        :icono="FilterX"
        @click="$emit('quitar')"
      >
        Quitar filtros
      </BotonBase>
    </div>
  </TarjetaBase>
</template>
