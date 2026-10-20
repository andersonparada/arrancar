<script setup lang="ts">
import { FileSpreadsheet, Printer } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import { VENTANA_DEL_ANALISIS as textos } from '../../textos-del-analisis';

/** Excel del análisis a la vista e imprimir lo que se ve; cada uno con su permiso. */
defineProps<{ ocupado: boolean; deshabilitado: boolean }>();
defineEmits<{ exportar: []; imprimir: [] }>();
</script>

<template>
  <div class="flex flex-wrap gap-2 print:hidden">
    <BotonBase
      v-permiso="'libro-de-compras.analisis-de-compras.exportar'"
      variante="secundario"
      :icono="FileSpreadsheet"
      :deshabilitado="ocupado || deshabilitado"
      @click="$emit('exportar')"
    >
      {{ textos.exportar }}
    </BotonBase>
    <BotonBase
      v-permiso="'libro-de-compras.analisis-de-compras.ver'"
      variante="secundario"
      :icono="Printer"
      :deshabilitado="deshabilitado"
      @click="$emit('imprimir')"
    >
      {{ textos.imprimir }}
    </BotonBase>
  </div>
</template>
