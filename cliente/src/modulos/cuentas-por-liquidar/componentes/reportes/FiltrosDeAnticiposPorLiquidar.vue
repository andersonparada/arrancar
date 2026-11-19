<script setup lang="ts">
import { FilterX } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import type { FiltrosDeAnticiposPorLiquidar } from '../../composables/reportes/anticipos-por-liquidar';

defineProps<{ errorDelCorte?: string; cantidad: number }>();
const filtros = defineModel<FiltrosDeAnticiposPorLiquidar>({ required: true });
defineEmits<{ quitar: [] }>();
</script>

<template>
  <TarjetaBase class="print:hidden">
    <div class="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
      <CampoTexto
        v-model="filtros.corte"
        etiqueta="Fecha de corte"
        tipo="date"
        :error="errorDelCorte"
        ayuda="Lo que faltaba por justificar al cierre de ese día."
      />
      <CampoInterruptor v-model="filtros.soloVencidos" etiqueta="Solo los vencidos" class="sm:pt-6" />
    </div>
    <div v-if="cantidad > 0" class="mt-3 flex justify-end">
      <BotonBase variante="fantasma" pequeno :icono="FilterX" @click="$emit('quitar')">Quitar filtros</BotonBase>
    </div>
  </TarjetaBase>
</template>
