<script setup lang="ts">
import type { Component } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import EncabezadoDeImpresion from '@/modulos/core/componentes/reportes/EncabezadoDeImpresion.vue';
import TotalesDelReporte from '@/modulos/core/componentes/reportes/TotalesDelReporte.vue';
import type { TotalDelReporte } from '../../composables/reportes/resumen-de-reportes';
import AccionesDelReporte from './AccionesDelReporte.vue';
import LeyendasDelReporte from './LeyendasDelReporte.vue';

/**
 * El marco común de los reportes de Caja chica: título, Excel e imprimir, filtros (en el espacio `filtros`), cifras de
 * arriba, el reporte (espacio por omisión), un aviso si no hay nada y las leyendas contables al pie.
 */
defineProps<{
  titulo: string;
  descripcion: string;
  /** Las líneas del encabezado que solo sale en papel. */
  lineasDeImpresion: string[];
  totales: TotalDelReporte[];
  leyendas: string[];
  /** Todavía no llegó ningún reporte. */
  cargando: boolean;
  /** Llegó el reporte (se muestran cifras y leyendas). */
  listo: boolean;
  /** El reporte llegó pero no trae nada. */
  vacio: boolean;
  cantidadDeFiltros: number;
  iconoVacio: Component;
  tituloVacio: string;
  descripcionVacia: string;
}>();
defineEmits<{ exportar: []; imprimir: []; quitar: [] }>();
</script>

<template>
  <div class="space-y-4">
    <EncabezadoPagina :titulo="titulo" :descripcion="descripcion" class="print:hidden">
      <AccionesDelReporte @exportar="$emit('exportar')" @imprimir="$emit('imprimir')" />
    </EncabezadoPagina>
    <slot name="filtros" />
    <EncabezadoDeImpresion :titulo="titulo" :lineas="lineasDeImpresion" />

    <p v-if="!listo && cargando" class="text-sm text-tierra-500" role="status">Cargando…</p>
    <div v-else-if="listo" :class="{ 'opacity-60': cargando }" :aria-busy="cargando" class="space-y-4">
      <TotalesDelReporte :totales="totales" titulo="Totales" />
      <EstadoVacio v-if="vacio" :icono="iconoVacio" :titulo="tituloVacio" :descripcion="descripcionVacia">
        <BotonBase v-if="cantidadDeFiltros > 0" variante="secundario" @click="$emit('quitar')">
          Quitar filtros
        </BotonBase>
      </EstadoVacio>
      <div v-else class="space-y-3"><slot /></div>
      <LeyendasDelReporte :leyendas="leyendas" />
    </div>
  </div>
</template>
