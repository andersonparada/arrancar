<script setup lang="ts">
import { computed } from 'vue';
import { Gauge } from 'lucide-vue-next';
import TarjetaDeEstadoDeFondo from '../componentes/reportes/TarjetaDeEstadoDeFondo.vue';
import FiltrosAlCorte from '../componentes/reportes/FiltrosAlCorte.vue';
import MarcoDeReporte from '../componentes/reportes/MarcoDeReporte.vue';
import { lineasDeImpresionAlCorte } from '../composables/reportes/filtros-de-reportes';
import { totalesDeEstadoDeFondos } from '../composables/reportes/resumen-de-reportes';
import { usarEstadoDeLosFondos } from '../composables/reportes/usar-reportes-de-caja-chica';
import { VENTANAS_CAJA_CHICA } from '../textos';

const ventana = VENTANAS_CAJA_CHICA.estadoDeLosFondos;
const r = usarEstadoDeLosFondos();
const lineas = computed(() => lineasDeImpresionAlCorte(r.filtros, r.nombreDelFondo.value));
const reporte = computed(() => r.reporte.value);
const imprimir = (): void => window.print();
</script>

<template>
  <MarcoDeReporte
    :titulo="ventana.titulo"
    :descripcion="ventana.descripcion"
    :lineas-de-impresion="lineas"
    :totales="reporte ? totalesDeEstadoDeFondos(reporte) : []"
    :leyendas="reporte?.leyendas ?? []"
    :cargando="r.cargando.value"
    :listo="reporte !== null"
    :vacio="reporte?.fondos.length === 0"
    :cantidad-de-filtros="r.cantidadDeFiltros.value"
    :icono-vacio="Gauge"
    titulo-vacio="No había fondos abiertos"
    descripcion-vacia="Ningún fondo estaba abierto a esa fecha. Pruebe con otra fecha de corte."
    @exportar="r.exportar"
    @imprimir="imprimir"
    @quitar="r.quitarFiltros"
  >
    <template #filtros>
      <FiltrosAlCorte
        v-model="r.filtros"
        :errores="r.errores.value"
        :cantidad="r.cantidadDeFiltros.value"
        :fondos="r.opcionesDeFondos.value"
        @quitar="r.quitarFiltros"
      />
    </template>
    <TarjetaDeEstadoDeFondo v-for="fondo in reporte?.fondos" :key="fondo.fondoId" :fondo="fondo" />
  </MarcoDeReporte>
</template>
