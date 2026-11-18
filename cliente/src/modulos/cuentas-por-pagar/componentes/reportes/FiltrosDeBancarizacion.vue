<script setup lang="ts">
import { computed } from 'vue';
import { FilterX } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { opcionesDeProveedor } from '../../composables/filtros-de-documentos';
import { MAXIMO_DE_MESES, type FiltrosDeBancarizacion } from '../../composables/reportes/bancarizacion';
import type { ProveedorParaFiltro } from '../../servicios/tipos';

const props = defineProps<{
  proveedores: ProveedorParaFiltro[];
  meses: { valor: string; texto: string }[];
  errorDelRango?: string;
  cantidad: number;
}>();
const filtros = defineModel<FiltrosDeBancarizacion>({ required: true });
defineEmits<{ quitar: [] }>();
const opciones = computed(() => opcionesDeProveedor(props.proveedores));
</script>

<template>
  <TarjetaBase class="print:hidden">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <CampoSelector
        v-model="filtros.desde"
        etiqueta="Desde el mes"
        :opciones="meses"
        :error="errorDelRango"
        :ayuda="`Máximo ${MAXIMO_DE_MESES} meses.`"
      />
      <CampoSelector v-model="filtros.hasta" etiqueta="Hasta el mes" :opciones="meses" />
      <CampoSelector v-model="filtros.proveedorId" etiqueta="Proveedor" :opciones="opciones" />
    </div>
    <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
      <CampoInterruptor
        v-model="filtros.soloConEfecto"
        etiqueta="Solo con efecto fiscal"
        descripcion="Oculta los pagos cuyos cargos no pierden crédito fiscal ni costo."
      />
      <BotonBase v-if="cantidad > 0" variante="fantasma" pequeno :icono="FilterX" @click="$emit('quitar')">
        Quitar filtros
      </BotonBase>
    </div>
  </TarjetaBase>
</template>
