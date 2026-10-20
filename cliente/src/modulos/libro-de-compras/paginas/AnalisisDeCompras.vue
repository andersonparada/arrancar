<script setup lang="ts">
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import PanelDelAnalisis from '../componentes/analisis/PanelDelAnalisis.vue';
import PestanasDelAnalisis from '../componentes/analisis/PestanasDelAnalisis.vue';
import SalidasDelAnalisis from '../componentes/analisis/SalidasDelAnalisis.vue';
import SelectorDeRango from '../componentes/analisis/SelectorDeRango.vue';
import { usarAnalisis } from '../composables/analisis/usar-analisis';
import { VENTANA_DEL_ANALISIS as textos } from '../textos-del-analisis';

const vista = usarAnalisis();
const imprimir = () => window.print();
</script>

<template>
  <div class="min-w-0">
    <EncabezadoPagina :titulo="textos.titulo" :descripcion="textos.descripcion">
      <SalidasDelAnalisis
        :ocupado="vista.descargando.value"
        :deshabilitado="vista.problema.value !== null"
        @exportar="vista.exportar"
        @imprimir="imprimir"
      />
    </EncabezadoPagina>

    <SelectorDeRango
      v-model="vista.rango"
      :opciones-desde="vista.opcionesDeDesde.value"
      :opciones-hasta="vista.opcionesDeHasta.value"
      :problema="vista.problema.value"
    />
    <PestanasDelAnalisis v-model="vista.analisis.value" />
    <div v-if="vista.analisis.value === 'compras-por-proveedor'" class="mb-4 max-w-md print:hidden">
      <CampoInterruptor
        v-model="vista.incluirFuera.value"
        :etiqueta="textos.incluirFuera"
        :descripcion="textos.incluirFueraAyuda"
      />
    </div>

    <PanelDelAnalisis
      :analisis="vista.analisis.value"
      :resultados="vista.resultados.value"
      :cargando="vista.cargando.value"
      :bloqueado="vista.problema.value !== null"
    />
  </div>
</template>
