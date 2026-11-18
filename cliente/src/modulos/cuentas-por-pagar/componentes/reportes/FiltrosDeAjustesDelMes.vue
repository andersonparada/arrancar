<script setup lang="ts">
import { computed } from 'vue';
import { FilterX } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { opcionesDeProveedor } from '../../composables/filtros-de-documentos';
import { OPCIONES_DE_CAUSA, type FiltrosDeAjustes } from '../../composables/reportes/ajustes-del-mes';
import type { ProveedorParaFiltro } from '../../servicios/tipos';

const props = defineProps<{
  proveedores: ProveedorParaFiltro[];
  meses: { valor: string; texto: string }[];
  cantidad: number;
}>();
const filtros = defineModel<FiltrosDeAjustes>({ required: true });
defineEmits<{ quitar: [] }>();
const opciones = computed(() => opcionesDeProveedor(props.proveedores));
</script>

<template>
  <TarjetaBase class="print:hidden">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <CampoSelector v-model="filtros.mes" etiqueta="Mes" :opciones="meses" ayuda="Por omisión, el mes anterior." />
      <CampoSelector v-model="filtros.proveedorId" etiqueta="Proveedor" :opciones="opciones" />
      <CampoSelector v-model="filtros.causa" etiqueta="Causa del ajuste" :opciones="OPCIONES_DE_CAUSA" />
    </div>
    <div v-if="cantidad > 0" class="mt-3 flex justify-end">
      <BotonBase variante="fantasma" pequeno :icono="FilterX" @click="$emit('quitar')">Quitar filtros</BotonBase>
    </div>
  </TarjetaBase>
</template>
