<script setup lang="ts">
import { computed } from 'vue';
import { FilterX } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { opcionesDeProveedor } from '../composables/filtros-de-documentos';
import {
  cantidadDeFiltrosDePagos,
  OPCIONES_DE_ESTADO_DE_PAGO,
  OPCIONES_DE_FORMA,
  OPCIONES_DE_POSFECHADO,
  type FiltrosDePagos,
} from '../composables/pagos/lista-de-pagos';
import type { ProveedorParaFiltro } from '../servicios/tipos';

/** Los filtros de la lista de pagos; «Solo posfechados» deja los cheques comprometidos a una fecha futura. */
const props = defineProps<{
  proveedores: ProveedorParaFiltro[];
  cuentas: { valor: string; texto: string }[];
}>();
const filtros = defineModel<FiltrosDePagos>({ required: true });
defineEmits<{ quitar: [] }>();
const opcionesDeProveedores = computed(() => opcionesDeProveedor(props.proveedores));
</script>

<template>
  <TarjetaBase class="mb-4">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <CampoSelector v-model="filtros.proveedorId" etiqueta="Proveedor" :opciones="opcionesDeProveedores" />
      <CampoSelector v-model="filtros.forma" etiqueta="Forma de pago" :opciones="OPCIONES_DE_FORMA" />
      <CampoSelector v-model="filtros.estado" etiqueta="Estado" :opciones="OPCIONES_DE_ESTADO_DE_PAGO" />
      <CampoSelector v-model="filtros.posfechado" etiqueta="Cheques posfechados" :opciones="OPCIONES_DE_POSFECHADO" />
      <CampoTexto v-model="filtros.desde" etiqueta="Desde" tipo="date" />
      <CampoTexto v-model="filtros.hasta" etiqueta="Hasta" tipo="date" />
      <CampoSelector
        v-if="cuentas.length > 1"
        v-model="filtros.cuentaBancariaId"
        etiqueta="Cuenta bancaria"
        :opciones="cuentas"
      />
    </div>
    <div v-if="cantidadDeFiltrosDePagos(filtros) > 0" class="mt-3 flex justify-end">
      <BotonBase variante="fantasma" pequeno :icono="FilterX" @click="$emit('quitar')">Quitar filtros</BotonBase>
    </div>
  </TarjetaBase>
</template>
