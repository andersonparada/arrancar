<script setup lang="ts">
import { FilterX } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import {
  cantidadDeFiltrosDeRetiros,
  OPCIONES_DE_ESTADO_DE_RETIRO,
  type FiltrosDeRetiros,
} from '../composables/retiros/lista-de-retiros';

/**
 * Los filtros de la lista de retiros. La «fecha de corte» responde: ¿cuánto efectivo estaba en manos de los custodios al
 * cierre de ese día? (útil al cerrar el mes).
 */
defineProps<{ hoy: string }>();
const filtros = defineModel<FiltrosDeRetiros>({ required: true });
defineEmits<{ quitar: [] }>();
</script>

<template>
  <TarjetaBase class="mb-4">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <CampoSelector v-model="filtros.estado" etiqueta="Estado" :opciones="OPCIONES_DE_ESTADO_DE_RETIRO" />
      <CampoTexto
        v-model="filtros.corte"
        etiqueta="Fecha de corte"
        tipo="date"
        :maximo="hoy"
        ayuda="Efectivo que seguía en manos de los custodios al cierre de ese día."
      />
      <CampoTexto v-model="filtros.desde" etiqueta="Retirados desde" tipo="date" />
      <CampoTexto v-model="filtros.hasta" etiqueta="Retirados hasta" tipo="date" />
    </div>
    <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
      <CampoInterruptor v-model="filtros.soloConDisponible" etiqueta="Solo los que aún tienen efectivo" />
      <BotonBase
        v-if="cantidadDeFiltrosDeRetiros(filtros) > 0"
        variante="fantasma"
        pequeno
        :icono="FilterX"
        @click="$emit('quitar')"
      >
        Quitar filtros
      </BotonBase>
    </div>
  </TarjetaBase>
</template>
