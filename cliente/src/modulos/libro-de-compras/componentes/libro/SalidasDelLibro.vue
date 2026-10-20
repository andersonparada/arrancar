<script setup lang="ts">
import { FileCheck, FileSearch, FileSpreadsheet, ListOrdered } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import { VENTANA_DEL_LIBRO as textos } from '../../textos-del-libro';

/** Excel, borrador sin folios, emisión con folios y corrección del último folio; cada una con su permiso. */
defineProps<{ ocupado: boolean }>();
defineEmits<{ exportar: []; borrador: []; emitir: []; corregirFolio: [] }>();
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <BotonBase
      v-permiso="'libro-de-compras.libro.exportar'"
      variante="secundario"
      :icono="FileSpreadsheet"
      :deshabilitado="ocupado"
      @click="$emit('exportar')"
    >
      {{ textos.exportar }}
    </BotonBase>
    <BotonBase
      v-permiso="'libro-de-compras.libro.ver'"
      variante="secundario"
      :icono="FileSearch"
      :deshabilitado="ocupado"
      :title="textos.borradorAyuda"
      @click="$emit('borrador')"
    >
      {{ textos.borrador }}
    </BotonBase>
    <BotonBase v-permiso="'libro-de-compras.libro.emitir'" :icono="FileCheck" @click="$emit('emitir')">
      {{ textos.emitir }}
    </BotonBase>
    <BotonBase
      v-permiso="'libro-de-compras.libro.emitir'"
      variante="fantasma"
      :icono="ListOrdered"
      @click="$emit('corregirFolio')"
    >
      {{ textos.corregirFolio }}
    </BotonBase>
  </div>
</template>
