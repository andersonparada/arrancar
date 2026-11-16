<script setup lang="ts">
import { computed } from 'vue';
import { FilterX } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { opcionesDeProveedor } from '../../composables/filtros-de-documentos';
import {
  OPCIONES_DE_AUTORIZACION,
  OPCIONES_DE_ORDEN,
  type FiltrosDeSaldos,
} from '../../composables/reportes/filtros-de-saldos';
import type { ProveedorParaFiltro } from '../../servicios/tipos';
import FiltroDeCorte from './FiltroDeCorte.vue';

const props = defineProps<{ proveedores: ProveedorParaFiltro[]; errorDelCorte?: string; cantidad: number }>();
const filtros = defineModel<FiltrosDeSaldos>({ required: true });
defineEmits<{ quitar: [] }>();
const opcionesDeProveedores = computed(() => opcionesDeProveedor(props.proveedores));
</script>

<template>
  <TarjetaBase class="print:hidden">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <FiltroDeCorte v-model="filtros.corte" :error="errorDelCorte" />
      <CampoSelector v-model="filtros.proveedorId" etiqueta="Proveedor" :opciones="opcionesDeProveedores" />
      <CampoSelector v-model="filtros.autorizacion" etiqueta="Documentos" :opciones="OPCIONES_DE_AUTORIZACION" />
      <CampoSelector v-model="filtros.orden" etiqueta="Orden" :opciones="OPCIONES_DE_ORDEN" />
    </div>
    <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
      <CampoInterruptor
        v-model="filtros.incluirSinSaldo"
        etiqueta="Incluir proveedores sin saldo"
        descripcion="Los que están en cero al corte."
      />
      <BotonBase v-if="cantidad > 0" variante="fantasma" pequeno :icono="FilterX" @click="$emit('quitar')">
        Quitar filtros
      </BotonBase>
    </div>
  </TarjetaBase>
</template>
