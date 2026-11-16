<script setup lang="ts">
import { computed } from 'vue';
import { FilterX } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { OPCIONES_DE_ORIGEN, opcionesDeProveedor, opcionesDeTipo } from '../../composables/filtros-de-documentos';
import { OPCIONES_DE_AUTORIZACION } from '../../composables/reportes/filtros-de-saldos';
import {
  OPCIONES_DE_ESTADO_DE_PAGO,
  VISTAS_DE_DOCUMENTOS,
  type FiltrosDeDocumentos,
  type VistaDeDocumentos,
} from '../../composables/reportes/vistas-de-documentos';
import type { ProveedorParaFiltro } from '../../servicios/tipos';
import FiltroDeCorte from './FiltroDeCorte.vue';

const props = defineProps<{ proveedores: ProveedorParaFiltro[]; errorDelCorte?: string; cantidad: number }>();
const filtros = defineModel<FiltrosDeDocumentos>({ required: true });
defineEmits<{ cambiarVista: [vista: VistaDeDocumentos]; quitar: [] }>();

const opcionesDeVista = VISTAS_DE_DOCUMENTOS.map(({ valor, texto }) => ({ valor, texto }));
const opcionesDeProveedores = computed(() => opcionesDeProveedor(props.proveedores));
const ayudaDeLaVista = computed(() => VISTAS_DE_DOCUMENTOS.find((v) => v.valor === filtros.value.vista)?.ayuda);
const tipos = opcionesDeTipo().filter((opcion) => opcion.valor !== 'nota_de_credito');
</script>

<template>
  <TarjetaBase class="print:hidden">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div class="sm:col-span-2">
        <CampoSelector
          :model-value="filtros.vista"
          etiqueta="Vista"
          :opciones="opcionesDeVista"
          @update:model-value="(vista) => vista && $emit('cambiarVista', vista)"
        />
        <p class="mt-1 text-xs text-tierra-600 dark:text-tierra-300">{{ ayudaDeLaVista }}</p>
      </div>
      <FiltroDeCorte v-model="filtros.corte" :error="errorDelCorte" />
      <CampoSelector v-model="filtros.proveedorId" etiqueta="Proveedor" :opciones="opcionesDeProveedores" />
    </div>
    <details class="mt-3">
      <summary
        class="cursor-pointer rounded text-sm font-medium text-tierra-700 focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none dark:text-tierra-200"
      >
        Más filtros
      </summary>
      <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CampoSelector v-model="filtros.autorizacion" etiqueta="Documentos" :opciones="OPCIONES_DE_AUTORIZACION" />
        <CampoSelector v-model="filtros.tipo" etiqueta="Tipo" :opciones="tipos" />
        <CampoSelector v-model="filtros.origen" etiqueta="Origen" :opciones="OPCIONES_DE_ORIGEN" />
        <CampoSelector
          v-model="filtros.estadoDePago"
          etiqueta="Estado de pago"
          :opciones="OPCIONES_DE_ESTADO_DE_PAGO"
        />
        <CampoTexto v-model="filtros.emitidosDesde" etiqueta="Emitidos desde" tipo="date" />
        <CampoTexto v-model="filtros.emitidosHasta" etiqueta="Emitidos hasta" tipo="date" />
        <CampoTexto v-model="filtros.venceHasta" etiqueta="Vencen hasta" tipo="date" />
      </div>
      <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <CampoInterruptor v-model="filtros.vencidos" etiqueta="Solo vencidos" />
        <CampoInterruptor v-model="filtros.sinContrasena" etiqueta="Sin contraseña" />
        <CampoInterruptor v-model="filtros.conRetencionesPorPracticar" etiqueta="Con retenciones por practicar" />
      </div>
    </details>
    <div v-if="cantidad > 0" class="mt-3 flex justify-end">
      <BotonBase variante="fantasma" pequeno :icono="FilterX" @click="$emit('quitar')">Quitar filtros</BotonBase>
    </div>
  </TarjetaBase>
</template>
