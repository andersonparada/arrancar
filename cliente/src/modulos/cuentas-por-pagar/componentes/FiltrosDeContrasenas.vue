<script setup lang="ts">
import { computed } from 'vue';
import { FilterX } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import {
  cantidadDeFiltrosDeContrasenas,
  OPCIONES_DE_ESTADO_DE_CONTRASENA,
  type FiltrosDeContrasenas,
} from '../composables/contrasenas/filtros-de-contrasenas';
import { opcionesDeProveedor } from '../composables/filtros-de-documentos';
import type { ProveedorParaFiltro } from '../servicios/tipos';

const props = defineProps<{ proveedores: ProveedorParaFiltro[] }>();
const filtros = defineModel<FiltrosDeContrasenas>({ required: true });
defineEmits<{ quitar: [] }>();
const opcionesDeProveedores = computed(() => opcionesDeProveedor(props.proveedores));
</script>

<template>
  <TarjetaBase class="mb-4">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <CampoSelector v-model="filtros.proveedorId" etiqueta="Proveedor" :opciones="opcionesDeProveedores" />
      <CampoSelector v-model="filtros.estado" etiqueta="Estado" :opciones="OPCIONES_DE_ESTADO_DE_CONTRASENA" />
      <span class="hidden lg:block" />
      <CampoTexto v-model="filtros.desde" etiqueta="Entregadas desde" tipo="date" />
      <CampoTexto v-model="filtros.hasta" etiqueta="Entregadas hasta" tipo="date" />
      <span class="hidden lg:block" />
      <CampoTexto v-model="filtros.pagoDesde" etiqueta="Pago prometido desde" tipo="date" />
      <CampoTexto v-model="filtros.pagoHasta" etiqueta="Pago prometido hasta" tipo="date" />
    </div>
    <div v-if="cantidadDeFiltrosDeContrasenas(filtros) > 0" class="mt-3 flex justify-end">
      <BotonBase variante="fantasma" pequeno :icono="FilterX" @click="$emit('quitar')">Quitar filtros</BotonBase>
    </div>
  </TarjetaBase>
</template>
