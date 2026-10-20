<script setup lang="ts">
import { FileSpreadsheet, Printer } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import { VENTANA_DE_RETENCIONES as textos } from '../../textos-de-retenciones';

/** Excel (con los mismos filtros) e imprimir lo que se ve; cada uno con su permiso. */
defineProps<{ ocupado: boolean }>();
defineEmits<{ exportar: []; imprimir: [] }>();
</script>

<template>
  <div class="flex flex-wrap gap-2 print:hidden">
    <BotonBase
      v-permiso="'libro-de-compras.retenciones.exportar'"
      variante="secundario"
      :icono="FileSpreadsheet"
      :deshabilitado="ocupado"
      @click="$emit('exportar')"
    >
      {{ textos.exportar }}
    </BotonBase>
    <BotonBase
      v-permiso="'libro-de-compras.retenciones.ver'"
      variante="secundario"
      :icono="Printer"
      @click="$emit('imprimir')"
    >
      {{ textos.imprimir }}
    </BotonBase>
  </div>
</template>
