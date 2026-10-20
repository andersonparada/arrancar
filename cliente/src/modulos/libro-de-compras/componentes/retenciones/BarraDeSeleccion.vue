<script setup lang="ts">
import { ClipboardCheck } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { textoDeCantidad } from '../../composables/retenciones/datos-de-retenciones';

/** Qué se puede hacer con lo marcado: anotar constancias en lote, marcar las que faltan o soltar la selección. */
defineProps<{ marcadas: number; total: string; posibles: number }>();
defineEmits<{ anotar: []; marcarPosibles: []; limpiar: [] }>();
</script>

<template>
  <div
    v-permiso="'libro-de-compras.retenciones.constancias'"
    class="sticky bottom-2 z-10 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-3 shadow-lg ring-1 ring-tierra-200 print:hidden dark:bg-tierra-800 dark:ring-tierra-600"
  >
    <p v-if="marcadas > 0" class="text-sm" role="status">
      <strong>{{ textoDeCantidad(marcadas, 'retención marcada', 'retenciones marcadas') }}</strong>
      por {{ formatearMonto(total) }}
    </p>
    <p v-else-if="posibles > 0" class="text-sm text-tierra-600 dark:text-tierra-300">
      {{ textoDeCantidad(posibles, 'retención sin constancia', 'retenciones sin constancia') }}. Marque las que quiera o
      todas a la vez.
    </p>
    <p v-else class="text-sm text-tierra-600 dark:text-tierra-300">
      Todas las retenciones de la lista tienen constancia.
    </p>
    <div class="flex flex-wrap gap-2">
      <BotonBase v-if="marcadas === 0 && posibles > 0" variante="secundario" @click="$emit('marcarPosibles')">
        Marcar las {{ posibles }} sin constancia
      </BotonBase>
      <BotonBase v-if="marcadas > 0" variante="fantasma" @click="$emit('limpiar')">Quitar marcas</BotonBase>
      <BotonBase v-if="marcadas > 0" :icono="ClipboardCheck" @click="$emit('anotar')">Anotar constancias</BotonBase>
    </div>
  </div>
</template>
