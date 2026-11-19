<script setup lang="ts">
import { computed } from 'vue';
import { FilterX } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { opcionesDeProveedor } from '../../composables/filtros-de-documentos';
import { OPCIONES_DE_PRESENTACION, type FiltrosDeEstadoDeCuenta } from '../../composables/reportes/estado-de-cuenta';
import type { ProveedorParaFiltro } from '../../servicios/tipos';

const props = defineProps<{ proveedores: ProveedorParaFiltro[]; errorDelRango?: string; cantidad: number }>();
const filtros = defineModel<FiltrosDeEstadoDeCuenta>({ required: true });
defineEmits<{ quitar: [] }>();
// Aquí no hay «todos»: el estado de cuenta es de un solo proveedor.
const opciones = computed(() => [
  { valor: '', texto: 'Elija un proveedor' },
  ...opcionesDeProveedor(props.proveedores).slice(1),
]);
</script>

<template>
  <TarjetaBase class="print:hidden">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <CampoSelector v-model="filtros.proveedorId" etiqueta="Proveedor" :opciones="opciones" requerido />
      <CampoTexto v-model="filtros.desde" etiqueta="Desde" tipo="date" :error="errorDelRango" />
      <CampoTexto v-model="filtros.hasta" etiqueta="Hasta" tipo="date" />
      <CampoSelector v-model="filtros.presentacion" etiqueta="Presentación" :opciones="OPCIONES_DE_PRESENTACION" />
    </div>
    <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
      <CampoInterruptor
        v-model="filtros.mostrarAnulados"
        etiqueta="Mostrar anulados dentro del rango"
        :descripcion="
          filtros.presentacion === 'para_el_proveedor'
            ? 'No disponible en el estado que se manda al proveedor.'
            : 'Salen en gris y no suman al saldo.'
        "
        :deshabilitado="filtros.presentacion === 'para_el_proveedor'"
      />
      <BotonBase v-if="cantidad > 0" variante="fantasma" pequeno :icono="FilterX" @click="$emit('quitar')">
        Quitar filtros
      </BotonBase>
    </div>
  </TarjetaBase>
</template>
