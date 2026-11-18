<script setup lang="ts">
import { computed } from 'vue';
import { FilterX } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { opcionesDeProveedor } from '../../composables/filtros-de-documentos';
import {
  OPCIONES_DE_ESTADO,
  OPCIONES_DE_FORMA,
  type FiltrosDePagos,
} from '../../composables/reportes/pagos-realizados';
import type { ProveedorParaFiltro } from '../../servicios/tipos';

const props = defineProps<{ proveedores: ProveedorParaFiltro[]; errorDelRango?: string; cantidad: number }>();
const filtros = defineModel<FiltrosDePagos>({ required: true });
defineEmits<{ quitar: [] }>();
const opciones = computed(() => opcionesDeProveedor(props.proveedores));
</script>

<template>
  <TarjetaBase class="print:hidden">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <CampoTexto v-model="filtros.desde" etiqueta="Desde" tipo="date" :error="errorDelRango" />
      <CampoTexto v-model="filtros.hasta" etiqueta="Hasta" tipo="date" />
      <CampoSelector v-model="filtros.proveedorId" etiqueta="Proveedor" :opciones="opciones" />
      <CampoSelector v-model="filtros.forma" etiqueta="Forma de pago" :opciones="OPCIONES_DE_FORMA" />
      <CampoSelector v-model="filtros.estado" etiqueta="Estado" :opciones="OPCIONES_DE_ESTADO" />
    </div>
    <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap gap-x-6 gap-y-2">
        <CampoInterruptor
          v-model="filtros.posfechados"
          etiqueta="Solo posfechados"
          descripcion="Pagos con fecha posterior al día en que se registraron."
        />
        <CampoInterruptor
          v-model="filtros.mismaPersona"
          etiqueta="Control: misma persona"
          descripcion="Documentos que registró o autorizó quien registró el pago."
        />
      </div>
      <BotonBase v-if="cantidad > 0" variante="fantasma" pequeno :icono="FilterX" @click="$emit('quitar')">
        Quitar filtros
      </BotonBase>
    </div>
  </TarjetaBase>
</template>
