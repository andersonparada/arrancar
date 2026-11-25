<script setup lang="ts">
import { computed } from 'vue';
import { FilterX } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import {
  cantidadDeFiltros,
  opcionesDeCliente,
  opcionesDeDestino,
  opcionesDePeriodo,
  OPCIONES_DE_ESTADO,
  opcionesDeTipoParaFiltrar,
  type FiltrosDeDocumentos,
} from '../../composables/documentos/filtros-de-documentos';
import type { ClienteParaVentas } from '../../servicios/documentos.api';

const props = defineProps<{ clientes: ClienteParaVentas[] }>();
const filtros = defineModel<FiltrosDeDocumentos>({ required: true });
defineEmits<{ quitar: [] }>();

const periodos = computed(() => opcionesDePeriodo(new Date(), filtros.value.periodo));
const opcionesDeClientes = computed(() => opcionesDeCliente(props.clientes));
const destinos = opcionesDeDestino();
const tipos = opcionesDeTipoParaFiltrar();
</script>

<template>
  <TarjetaBase class="mb-4">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <CampoTexto v-model="filtros.texto" tipo="search" etiqueta="Buscar" placeholder="Serie, número, nombre o NIT" />
      <CampoSelector v-model="filtros.periodo" etiqueta="Período" :opciones="periodos" />
      <CampoSelector v-model="filtros.clienteId" etiqueta="Cliente" :opciones="opcionesDeClientes" />
      <CampoSelector v-model="filtros.tipo" etiqueta="Tipo" :opciones="tipos" />
      <CampoSelector v-model="filtros.destino" etiqueta="Destino" :opciones="destinos" />
      <CampoSelector v-model="filtros.estado" etiqueta="Estado" :opciones="OPCIONES_DE_ESTADO" />
    </div>
    <div v-if="cantidadDeFiltros(filtros) > 0" class="mt-3 flex justify-end">
      <BotonBase variante="fantasma" pequeno :icono="FilterX" @click="$emit('quitar')">Quitar filtros</BotonBase>
    </div>
  </TarjetaBase>
</template>
