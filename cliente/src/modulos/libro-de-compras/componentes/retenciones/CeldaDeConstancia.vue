<script setup lang="ts">
import { Pencil, Plus, Trash2 } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import { formatearFecha } from '@/modulos/core/utilidades/formato';
import type { RetencionDelMes } from '../../servicios/retenciones.api';

/** La constancia de una retención y sus acciones: anotarla, corregirla o quitarla. */
defineProps<{ retencion: RetencionDelMes }>();
defineEmits<{ anotar: []; quitar: [] }>();
</script>

<template>
  <div class="flex flex-col items-start gap-1.5">
    <template v-if="retencion.constanciaNumero">
      <p class="break-all font-medium">{{ retencion.constanciaNumero }}</p>
      <p class="text-xs text-tierra-600 dark:text-tierra-300">{{ formatearFecha(retencion.constanciaFecha) }}</p>
      <div v-permiso="'libro-de-compras.retenciones.constancias'" class="flex gap-1 print:hidden">
        <BotonBase pequeno variante="fantasma" :icono="Pencil" @click="$emit('anotar')">Corregir</BotonBase>
        <BotonBase pequeno variante="fantasma" :icono="Trash2" @click="$emit('quitar')">Quitar</BotonBase>
      </div>
    </template>
    <template v-else>
      <span class="text-tierra-500">{{ retencion.enCero ? '—' : 'Sin constancia' }}</span>
      <BotonBase
        v-if="!retencion.enCero"
        v-permiso="'libro-de-compras.retenciones.constancias'"
        class="print:hidden"
        pequeno
        variante="secundario"
        :icono="Plus"
        @click="$emit('anotar')"
      >
        Anotar
      </BotonBase>
    </template>
  </div>
</template>
