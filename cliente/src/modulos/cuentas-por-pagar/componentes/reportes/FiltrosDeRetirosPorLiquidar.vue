<script setup lang="ts">
import { FilterX } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import type { FiltrosDeRetiros } from '../../composables/reportes/retiros-por-liquidar';
import FiltroDeCorte from './FiltroDeCorte.vue';

defineProps<{ errorDelCorte?: string; cantidad: number }>();
const filtros = defineModel<FiltrosDeRetiros>({ required: true });
defineEmits<{ quitar: [] }>();
</script>

<template>
  <TarjetaBase class="print:hidden">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <FiltroDeCorte v-model="filtros.corte" :error="errorDelCorte" />
      <CampoTexto v-model="filtros.custodio" etiqueta="Custodio" ayuda="Parte del nombre de quien tiene el efectivo." />
    </div>
    <div v-if="cantidad > 0" class="mt-3 flex justify-end">
      <BotonBase variante="fantasma" pequeno :icono="FilterX" @click="$emit('quitar')">Quitar filtros</BotonBase>
    </div>
  </TarjetaBase>
</template>
