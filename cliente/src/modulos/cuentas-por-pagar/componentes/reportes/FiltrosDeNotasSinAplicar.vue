<script setup lang="ts">
import { FilterX } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import type { FiltrosDeNotas } from '../../composables/reportes/notas-sin-aplicar';
import FiltroDeCorte from './FiltroDeCorte.vue';

defineProps<{ cuentas: { valor: string; texto: string }[]; errorDelCorte?: string; cantidad: number }>();
const filtros = defineModel<FiltrosDeNotas>({ required: true });
defineEmits<{ quitar: [] }>();
</script>

<template>
  <TarjetaBase class="print:hidden">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <FiltroDeCorte v-model="filtros.corte" :error="errorDelCorte" />
      <CampoSelector v-model="filtros.cuentaBancariaId" etiqueta="Cuenta bancaria" :opciones="cuentas" />
    </div>
    <div v-if="cantidad > 0" class="mt-3 flex justify-end">
      <BotonBase variante="fantasma" pequeno :icono="FilterX" @click="$emit('quitar')">Quitar filtros</BotonBase>
    </div>
  </TarjetaBase>
</template>
