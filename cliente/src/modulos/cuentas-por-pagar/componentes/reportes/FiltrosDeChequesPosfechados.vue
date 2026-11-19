<script setup lang="ts">
import { computed } from 'vue';
import { FilterX } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { opcionesDeProveedor } from '../../composables/filtros-de-documentos';
import type { FiltrosDeChequesPosfechados } from '../../composables/reportes/cheques-posfechados';
import type { ProveedorParaFiltro } from '../../servicios/tipos';
import FiltroDeCorte from './FiltroDeCorte.vue';

const props = defineProps<{ proveedores: ProveedorParaFiltro[]; errorDelCorte?: string; cantidad: number }>();
const filtros = defineModel<FiltrosDeChequesPosfechados>({ required: true });
defineEmits<{ quitar: [] }>();
const opciones = computed(() => opcionesDeProveedor(props.proveedores));
</script>

<template>
  <TarjetaBase class="print:hidden">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <FiltroDeCorte v-model="filtros.corte" :error="errorDelCorte" />
      <CampoSelector v-model="filtros.proveedorId" etiqueta="Proveedor" :opciones="opciones" />
    </div>
    <div v-if="cantidad > 0" class="mt-3 flex justify-end">
      <BotonBase variante="fantasma" pequeno :icono="FilterX" @click="$emit('quitar')">Quitar filtros</BotonBase>
    </div>
  </TarjetaBase>
</template>
