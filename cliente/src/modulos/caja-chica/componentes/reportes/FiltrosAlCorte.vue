<script setup lang="ts">
import { FilterX } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import type { FiltrosAlCorte } from '../../composables/reportes/filtros-de-reportes';

/** Los filtros de un reporte al corte: la fecha y, si se quiere, un solo fondo. */
defineProps<{ errores: { corte?: string }; cantidad: number; fondos: OpcionBuscable<string>[] }>();
const filtros = defineModel<FiltrosAlCorte>({ required: true });
defineEmits<{ quitar: [] }>();
</script>

<template>
  <TarjetaBase class="print:hidden">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <CampoTexto v-model="filtros.corte" etiqueta="Al corte del" tipo="date" :error="errores.corte" />
      <CampoSelector v-model="filtros.fondoId" etiqueta="Fondo" :opciones="fondos" />
    </div>
    <div v-if="cantidad > 0" class="mt-3 flex justify-end">
      <BotonBase variante="fantasma" pequeno :icono="FilterX" @click="$emit('quitar')">Quitar filtros</BotonBase>
    </div>
  </TarjetaBase>
</template>
