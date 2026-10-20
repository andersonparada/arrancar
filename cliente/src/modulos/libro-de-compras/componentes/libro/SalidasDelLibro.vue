<script setup lang="ts">
import { FileDown, FileSpreadsheet } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import { VENTANA_DEL_LIBRO as textos } from '../../textos-del-libro';
</script>

<!-- Excel y PDF con folios: su servidor llega en un paso siguiente, por eso aún no se pueden usar. -->
<template>
  <div class="flex flex-wrap gap-2">
    <BotonBase
      v-permiso="'libro-de-compras.libro.exportar'"
      variante="secundario"
      :icono="FileSpreadsheet"
      deshabilitado
      :title="textos.proximamente"
    >
      {{ textos.exportar }} (próximamente)
    </BotonBase>
    <BotonBase
      v-permiso="'libro-de-compras.libro.exportar'"
      variante="secundario"
      :icono="FileDown"
      deshabilitado
      :title="textos.proximamente"
    >
      {{ textos.pdf }} (próximamente)
    </BotonBase>
  </div>
</template>
