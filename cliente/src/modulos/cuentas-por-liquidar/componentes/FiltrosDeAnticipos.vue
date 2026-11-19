<script setup lang="ts">
import { FilterX } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import {
  cantidadDeFiltrosDeAnticipos,
  OPCIONES_DE_ESTADO_DE_ANTICIPO,
  type FiltrosDeAnticipos,
} from '../composables/anticipos/lista-de-anticipos';

/**
 * Los filtros de la lista de anticipos. La «fecha de corte» responde: ¿qué estaba por justificar al cierre de ese día?
 * (útil al cerrar el mes).
 */
defineProps<{ hoy: string; beneficiarios: { valor: string; texto: string }[] }>();
const filtros = defineModel<FiltrosDeAnticipos>({ required: true });
defineEmits<{ quitar: [] }>();
</script>

<template>
  <TarjetaBase class="mb-4">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <CampoSelector v-model="filtros.estado" etiqueta="Estado" :opciones="OPCIONES_DE_ESTADO_DE_ANTICIPO" />
      <CampoSelector
        v-if="beneficiarios.length > 0"
        v-model="filtros.beneficiarioId"
        etiqueta="Beneficiario"
        :opciones="beneficiarios"
      />
      <CampoTexto
        v-model="filtros.corte"
        etiqueta="Fecha de corte"
        tipo="date"
        :maximo="hoy"
        ayuda="Lo que seguía por justificar al cierre de ese día."
      />
    </div>
    <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
      <CampoInterruptor v-model="filtros.soloVencidos" etiqueta="Solo los vencidos" />
      <BotonBase
        v-if="cantidadDeFiltrosDeAnticipos(filtros) > 0"
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
