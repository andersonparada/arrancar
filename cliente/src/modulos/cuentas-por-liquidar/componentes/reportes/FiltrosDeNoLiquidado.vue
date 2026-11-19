<script setup lang="ts">
import { FilterX } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { OPCIONES_DE_DESTINO, type FiltrosDeNoLiquidado } from '../../composables/reportes/no-liquidado';

defineProps<{ errores: { desde?: string; hasta?: string }; cantidad: number }>();
const filtros = defineModel<FiltrosDeNoLiquidado>({ required: true });
defineEmits<{ quitar: [] }>();
const opciones = OPCIONES_DE_DESTINO;
</script>

<template>
  <TarjetaBase class="print:hidden">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <CampoTexto v-model="filtros.desde" etiqueta="Liquidado desde" tipo="date" :error="errores.desde" />
      <CampoTexto v-model="filtros.hasta" etiqueta="Liquidado hasta" tipo="date" :error="errores.hasta" />
      <CampoSelector v-model="filtros.destino" etiqueta="Destino" :opciones="opciones" />
    </div>
    <div v-if="cantidad > 0" class="mt-3 flex justify-end">
      <BotonBase variante="fantasma" pequeno :icono="FilterX" @click="$emit('quitar')">Quitar filtros</BotonBase>
    </div>
  </TarjetaBase>
</template>
