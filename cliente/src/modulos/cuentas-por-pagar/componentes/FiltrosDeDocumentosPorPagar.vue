<script setup lang="ts">
import { computed } from 'vue';
import { FilterX } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import {
  cantidadDeFiltros,
  opcionesDeProveedor,
  OPCIONES_DE_ESTADO,
  opcionesDeTipo,
  type FiltrosDeDocumentos,
} from '../composables/filtros-de-documentos';
import type { ProveedorParaFiltro } from '../servicios/tipos';

const props = defineProps<{ proveedores: ProveedorParaFiltro[] }>();
const filtros = defineModel<FiltrosDeDocumentos>({ required: true });
defineEmits<{ quitar: [] }>();

const opcionesDeProveedores = computed(() => opcionesDeProveedor(props.proveedores));
const tipos = opcionesDeTipo();
</script>

<template>
  <TarjetaBase class="mb-4">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <CampoSelector v-model="filtros.proveedorId" etiqueta="Proveedor" :opciones="opcionesDeProveedores" />
      <CampoSelector v-model="filtros.estado" etiqueta="Estado" :opciones="OPCIONES_DE_ESTADO" />
      <CampoSelector v-model="filtros.tipo" etiqueta="Tipo" :opciones="tipos" />
      <CampoTexto v-model="filtros.emitidosDesde" etiqueta="Emitidos desde" tipo="date" />
      <CampoTexto v-model="filtros.emitidosHasta" etiqueta="Emitidos hasta" tipo="date" />
      <CampoInterruptor
        v-model="filtros.soloVencidos"
        etiqueta="Solo vencidos"
        descripcion="Cargos con saldo cuyo plazo ya pasó."
        class="sm:self-end"
      />
    </div>
    <div v-if="cantidadDeFiltros(filtros) > 0" class="mt-3 flex justify-end">
      <BotonBase variante="fantasma" pequeno :icono="FilterX" @click="$emit('quitar')">Quitar filtros</BotonBase>
    </div>
  </TarjetaBase>
</template>
