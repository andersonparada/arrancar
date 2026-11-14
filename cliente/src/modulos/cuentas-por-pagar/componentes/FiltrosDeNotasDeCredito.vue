<script setup lang="ts">
import { computed } from 'vue';
import { FilterX } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { opcionesDeProveedor } from '../composables/filtros-de-documentos';
import {
  cantidadDeFiltrosDeNotas,
  OPCIONES_DE_ESTADO_DE_NOTA,
  type FiltrosDeNotas,
} from '../composables/notas-de-credito';
import type { ProveedorParaFiltro } from '../servicios/tipos';

const props = defineProps<{ proveedores: ProveedorParaFiltro[] }>();
const filtros = defineModel<FiltrosDeNotas>({ required: true });
defineEmits<{ quitar: [] }>();
const opcionesDeProveedores = computed(() => opcionesDeProveedor(props.proveedores));
</script>

<template>
  <TarjetaBase class="mb-4">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <CampoSelector v-model="filtros.proveedorId" etiqueta="Proveedor" :opciones="opcionesDeProveedores" />
      <CampoSelector v-model="filtros.estado" etiqueta="Estado" :opciones="OPCIONES_DE_ESTADO_DE_NOTA" />
      <CampoInterruptor
        v-model="filtros.conSaldo"
        etiqueta="Solo con saldo a favor"
        descripcion="Apáguelo para ver también las que ya se usaron por completo."
        class="sm:self-end"
      />
      <CampoTexto v-model="filtros.emitidasDesde" etiqueta="Emitidas desde" tipo="date" />
      <CampoTexto v-model="filtros.emitidasHasta" etiqueta="Emitidas hasta" tipo="date" />
    </div>
    <div v-if="cantidadDeFiltrosDeNotas(filtros) > 0" class="mt-3 flex justify-end">
      <BotonBase variante="fantasma" pequeno :icono="FilterX" @click="$emit('quitar')">Quitar filtros</BotonBase>
    </div>
  </TarjetaBase>
</template>
