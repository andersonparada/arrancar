<script setup lang="ts">
import { computed } from 'vue';
import { FilterX } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import {
  cantidadDeFiltros,
  opcionesDeDestino,
  opcionesDePeriodo,
  opcionesDeProveedor,
  OPCIONES_DE_ESTADO,
  opcionesDeTipo,
  type FiltrosDeDocumentos,
} from '../../composables/documentos/filtros-de-documentos';
import type { ProveedorParaFiltro } from '../../servicios/documentos.api';

const props = defineProps<{ proveedores: ProveedorParaFiltro[] }>();
const filtros = defineModel<FiltrosDeDocumentos>({ required: true });
defineEmits<{ quitar: [] }>();

const periodos = computed(() => opcionesDePeriodo(new Date(), filtros.value.periodo));
const opcionesDeProveedores = computed(() => opcionesDeProveedor(props.proveedores));
const destinos = opcionesDeDestino();
const tipos = opcionesDeTipo();
</script>

<template>
  <TarjetaBase class="mb-4">
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <CampoSelector v-model="filtros.periodo" etiqueta="Período" :opciones="periodos" />
      <CampoSelector v-model="filtros.proveedorId" etiqueta="Proveedor" :opciones="opcionesDeProveedores" />
      <CampoSelector v-model="filtros.estado" etiqueta="Estado" :opciones="OPCIONES_DE_ESTADO" />
      <CampoSelector v-model="filtros.destino" etiqueta="Destino" :opciones="destinos" />
      <CampoSelector v-model="filtros.tipo" etiqueta="Tipo" :opciones="tipos" />
    </div>
    <div v-if="cantidadDeFiltros(filtros) > 0" class="mt-3 flex justify-end">
      <BotonBase variante="fantasma" pequeno :icono="FilterX" @click="$emit('quitar')">Quitar filtros</BotonBase>
    </div>
  </TarjetaBase>
</template>
